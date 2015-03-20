# Copyright 2015 Esri
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""This Python Toolbox contains the calculation scripts used by POD"""

import arcpy
import arcpyproduction
import os
import sys
import json
import traceback

# The current architecture requires that the POD product files be located in the
# 'arcgisserver' folder. If this needs to be changed, the following four lines
# of code must be modified to point to the correct location
SCRIPTPATH = os.path.abspath(__file__)
SCRIPTSDIRECTORY = os.path.abspath(os.path.join(SCRIPTPATH, "Utilities"))
PARENTDIRECTORY = os.path.splitdrive(SCRIPTPATH)
UNCPARENTDIRECTORY = os.path.splitunc(SCRIPTPATH)

# This syntax is required for UNC paths
if PARENTDIRECTORY[0] == "":
    SCRIPTSDIRECTORY = os.path.join(UNCPARENTDIRECTORY[0], r'MCS_POD\Utilities')
    arcpy.AddMessage("Using UNC paths: " + SCRIPTSDIRECTORY)

# This syntax is required for local paths
else:
    SCRIPTSDIRECTORY = os.path.join(PARENTDIRECTORY[0], r'\arcgisserver\MCS_POD\Utilities')
    arcpy.AddMessage("Using local paths: " + SCRIPTSDIRECTORY)

sys.path.append(SCRIPTSDIRECTORY)
import Utilities

del SCRIPTPATH, PARENTDIRECTORY, SCRIPTSDIRECTORY, UNCPARENTDIRECTORY

class Toolbox(object):
    """Toolbox classes, ArcMap needs this class."""
    def __init__(self):
        """Define the toolbox (the name of the toolbox is the name of the
        .pyt file)."""
        self.label = "Calculator Tools"
        self.alias = "calculatorTools"

        # List of tool classes associated with this toolbox
        self.tools = [CalculateExtent, CalculateStripMap, CalculatePageSize, CalculateScale]

class CalculateBase(object):
    """The base class for all calculators"""

    def __init__(self):
        self.canRunInBackground = True

    def InitParameterInfo(self, calculateType):
        """Set parameter definitions"""
        # POI
        poi = arcpy.Parameter(displayName="Point of Interest",
                              name="point_of_interest",
                              datatype="GPFeatureRecordSetLayer",
                              parameterType="Required",
                              direction="Input")

        # AOI
        aoi = arcpy.Parameter(displayName="Area of Interest",
                              name="area_of_interest",
                              datatype="GPFeatureRecordSetLayer",
                              parameterType="Required",
                              direction="Input")
        # LOI
        loi = arcpy.Parameter(displayName="Line of Interest",
                              name="line_of_interest",
                              datatype="GPFeatureRecordSetLayer",
                              parameterType="Required",
                              direction="Input")

        # Product Name
        product_name = arcpy.Parameter(displayName="Product Name",
                                       name="product_name",
                                       datatype="GPString",
                                       parameterType="Required",
                                       direction="Input")

        # Grid XML
        grid_xml = arcpy.Parameter(displayName="Grid XML",
                                   name="grid_xml",
                                   datatype="GPString",
                                   parameterType="Required",
                                   direction="Input")

        # Scale
        scale = arcpy.Parameter(displayName="Scale",
                                name="scale",
                                datatype="GPDouble",
                                parameterType="Required",
                                direction="Input")

        # Page Size
        page_size = arcpy.Parameter(displayName="Page Size",
                                    name="page_size",
                                    datatype="GPString",
                                    parameterType="Required",
                                    direction="Input")
        # Page Margin
        margin = arcpy.Parameter(displayName="Margin",
                                 name="margin",
                                 datatype="GPString",
                                 parameterType="Optional",
                                 direction="Input")

        # Output Extent
        out_extent = arcpy.Parameter(displayName="Output Extent",
                                     name="out_extent",
                                     datatype="GPFeatureLayer",
                                     parameterType="Derived",
                                     direction="Output")

        # Output Page Size
        out_page_size = arcpy.Parameter(displayName="Output Page Size",
                                        name="out_page_size",
                                        datatype="GPString",
                                        parameterType="Derived",
                                        direction="Output")

        # Output scale
        out_scale = arcpy.Parameter(displayName="Output Scale",
                                    name="out_scale",
                                    datatype="GPDouble",
                                    parameterType="Derived",
                                    direction="Output")

        if calculateType.upper() == "EXTENT":
            params = [poi, product_name, grid_xml, scale, page_size, margin, out_extent]
        elif calculateType.upper() == "STRIPMAP":
            params = [loi, scale, page_size, margin, out_extent]
        elif calculateType.upper() == "PAGESIZE":
            params = [aoi, product_name, grid_xml, scale, margin, out_page_size]
        elif calculateType.upper() == "SCALE":
            params = [aoi, product_name, grid_xml, page_size, margin, out_scale]

        return params

    def isLicensed(self):
        """Set whether tool is licensed to execute."""
        if arcpy.CheckExtension("foundation") == "Available":
            return True
        return False

    def updateParameters(self, parameters):
        """Modify the values and properties of parameters before internal
        validation is performed.  This method is called whenever a parameter
        has been changed."""
        return

    def updateMessages(self, parameters):
        """Modify the messages created by internal validation for each tool
        parameter.  This method is called after internal validation."""
        return

class CalculateExtent(CalculateBase):
    """Calculate Extent class"""
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "CalculateExtent"
        self.description = "Calculate extent using grid"

    def getParameterInfo(self):
        """Define parameter definitions"""
        params = self.InitParameterInfo("EXTENT")
        return params

    def execute(self, params, messages):
        """The source code of the tool."""
        try:

            # Get input points
            featureset = arcpy.FeatureSet(params[0].value)

            product_name = params[1].value
            grid_xml_name = params[2].value
            grid_xml = os.path.join(Utilities.shared_products_path, product_name, grid_xml_name)
            if arcpy.Exists(grid_xml) != True:
                arcpy.AddError(grid_xml_name + " doesn't exist at " + os.path.join(Utilities.shared_products_path, product_name) + ".")
                raise arcpy.ExecuteError
            grid = arcpyproduction.mapping.Grid(grid_xml)

            # Get scale
            scale = params[3].value

            # Get page size
            page_id, orientation, page_width, page_height, page_units = Utilities.get_page_size(params[4].value)

            # Get page margin in page_units
            if params[5].value:
                margin_top, margin_right, margin_bottom, margin_left, margin_units = Utilities.get_page_margin(params[5].value, page_units)
                page_width, page_height = Utilities.get_margined_page_size(page_width, page_height, page_units, margin_top, margin_right, margin_bottom, margin_left, margin_units)

            out_extents = []
            fields = ["SHAPE@"]
            with arcpy.da.SearchCursor(featureset, fields) as cursor:
                for row in cursor:
                    point_geometry = row[0]
                    arcpy.AddMessage("Calculating Extent for point: " + point_geometry.JSON)

                    # Calculate the extent honoring units
                    extent = grid.calculateExtent(page_width,
                                                  page_height,
                                                  point_geometry,
                                                  scale,
                                                  page_units)                  
                    
                    out_extents.append(extent)

            out_features = arcpy.CreateUniqueName("calculated_extents", "in_memory")                    
            arcpy.CreateFeatureclass_management('in_memory', out_features.split("\\")[1] , "POLYGON", spatial_reference = out_extents[0].spatialReference)
            cursor = arcpy.da.InsertCursor(out_features, "SHAPE@")
            for extent in out_extents:
                row = cursor.insertRow([extent])
            params[6].value = out_features

            del grid, cursor
            return

        except arcpy.ExecuteError:
            arcpy.AddError(arcpy.GetMessages(2))
        except Exception as ex:
            arcpy.AddError(ex.message)
            tb = sys.exc_info()[2]
            tbinfo = traceback.format_tb(tb)[0]
            arcpy.AddError("Traceback info:\n" + tbinfo)

class CalculateStripMap(CalculateBase):
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "CalculateStripMap"
        self.description = "Calculate StripMap using polyline"

    def getParameterInfo(self):
        """Define parameter definitions"""
        params = self.InitParameterInfo("STRIPMAP")
        return params

    def execute(self, params, messages):
        """The source code of the tool."""
        try:
            # Input line features
            featureset = arcpy.FeatureSet(params[0].value)

            # Get scale
            scale = params[1].value

            # Get page size
            page_id, orientation, page_width, page_height, page_units = Utilities.get_page_size(params[2].value)

            # Get page margin in page_units
            if params[3].value:
                margin_top, margin_right, margin_bottom, margin_left, margin_units = Utilities.get_page_margin(params[3].value, page_units)
                page_width, page_height = Utilities.get_margined_page_size(page_width, page_height, page_units, margin_top, margin_right, margin_bottom, margin_left, margin_units)

            final_width = str(page_width) + " " + page_units
            final_height = str(page_height) + " " + page_units

            # Output to in-memory workspace
            out_features = arcpy.CreateUniqueName("calculated_extents", "in_memory")

            # Run Strip Map tool
            strip_map = arcpy.StripMapIndexFeatures_cartography(featureset,
                                                                out_features,
                                                                True,
                                                                scale,
                                                                final_height,
                                                                final_width,
                                                                direction_type = "WE_SN")
            params[4].value = strip_map.getOutput(0)
            return

        except arcpy.ExecuteError:
            arcpy.AddError(arcpy.GetMessages(2))
        except Exception as ex:
            tb = sys.exc_info()[2]
            tbinfo = traceback.format_tb(tb)[0]
            arcpy.AddError("Traceback info:\n" + tbinfo)

class CalculatePageSize(CalculateBase):
    """Calculate Page Size class"""
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "CalculatePageSize"
        self.description = "Calculate page size using grid"

    def getParameterInfo(self):
        """Define parameter definitions"""
        params = self.InitParameterInfo("PAGESIZE")
        return params

    def execute(self, params, messages):
        """The source code of the tool."""
        try:
            # Get input area of interest
            featureset = arcpy.FeatureSet(params[0].value)

            product_name = params[1].value
            grid_xml_name = params[2].value
            grid_xml = os.path.join(Utilities.shared_products_path,
                                    product_name, grid_xml_name)
            if arcpy.Exists(grid_xml) != True:
                arcpy.AddError(grid_xml_name + " doesn't exist at " + os.path.join(Utilities.shared_products_path, product_name) + ".")
                raise arcpy.ExecuteError
            grid = arcpyproduction.mapping.Grid(grid_xml)

            # Get scale
            scale = params[3].value

            # Get page margin in page_units
            top = right = bottom = left = 0
            units = "INCHES"
            margin_units = units
            if params[4].value:
                top, right, bottom, left, margin_units = Utilities.get_page_margin(params[4].value, units)

            fields = ["SHAPE@"]
            page_size = {}
            with arcpy.da.SearchCursor(featureset, fields) as cursor:
                for row in cursor:
                    area_geometry = row[0]
                    arcpy.AddMessage("Calculating page size for area of interest: " + area_geometry.JSON)

                    # Calculate the data frame size, honoring units
                    data_frame_size = grid.calculateDataFrameSize(area_geometry, scale, units)
                    if margin_units.upper() == "PERCENT":
                        top = data_frame_size["height"] * top * 0.01
                        right = data_frame_size["width"] * right * 0.01
                        bottom = data_frame_size["height"] * bottom * 0.01
                        left = data_frame_size["width"] * left * 0.01

                    page_size["width"] = data_frame_size["width"] + left + right
                    page_size["height"] = data_frame_size["height"] + top + bottom
                    page_size["units"] = data_frame_size["units"]
                    break

            params[5].value = json.dumps(page_size)

            del grid, cursor
            return

        except arcpy.ExecuteError:
            arcpy.AddError(arcpy.GetMessages(2))
        except Exception as ex:
            arcpy.AddError(ex.message)
            tb = sys.exc_info()[2]
            tbinfo = traceback.format_tb(tb)[0]
            arcpy.AddError("Traceback info:\n" + tbinfo)

class CalculateScale(CalculateBase):
    """Calculate Scale class"""
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "CalculateScale"
        self.description = "Calculate Scale using grid"

    def getParameterInfo(self):
        """Define parameter definitions"""

        params = self.InitParameterInfo("SCALE")
        return params

    def execute(self, params, messages):
        """The source code of the tool."""
        try:
            # Get input area of interest
            featureset = arcpy.FeatureSet(params[0].value)

            product_name = params[1].value
            grid_xml_name = params[2].value
            grid_xml = os.path.join(Utilities.shared_products_path,
                                    product_name, grid_xml_name)
            if arcpy.Exists(grid_xml) != True:
                arcpy.AddError(grid_xml_name + " doesn't exist at " + os.path.join(Utilities.shared_products_path, product_name) + ".")
                raise arcpy.ExecuteError
            grid = arcpyproduction.mapping.Grid(grid_xml)

            # Get page size
            page_id, orientation, page_width, page_height, page_units = Utilities.get_page_size(params[3].value)
            data_frame_width = page_width
            data_frame_height = page_height

            # Get page margin in page_units
            # top = right = bottom = left = 0
            if params[4].value:
                margin_top, margin_right, margin_bottom, margin_left, margin_units = Utilities.get_page_margin(params[4].value, page_units)
                data_frame_width, data_frame_height = Utilities.get_margined_page_size(page_width, page_height, page_units, margin_top, margin_right, margin_bottom, margin_left, margin_units)

            fields = ["SHAPE@"]
            with arcpy.da.SearchCursor(featureset, fields) as cursor:
                for row in cursor:
                    area_geometry = row[0]
                    arcpy.AddMessage("Calculating Scale for area of interest: " + area_geometry.JSON)

                    # Calculate the scale
                    scale = grid.calculateScale(data_frame_width,
                                                data_frame_height,
                                                area_geometry,
                                                page_units)
                    break

            params[5].value = scale

            del grid, cursor
            return

        except arcpy.ExecuteError:
            arcpy.AddError(arcpy.GetMessages(2))
        except Exception as ex:
            arcpy.AddError(ex.message)
            tb = sys.exc_info()[2]
            tbinfo = traceback.format_tb(tb)[0]
            arcpy.AddError("Traceback info:\n" + tbinfo)

# For Debugging Python Toolbox Scripts
# comment out when running in ArcMap
#def main():
    #g = CalculateExtent()
    #par = g.getParameterInfo()
    #g.execute(par, None)

#if __name__ == '__main__':
    #main()

