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

"""This python toolbox contains tools for
creating a new map for the Dynamic Page product"""
import arcpy
import arcpyproduction
import sys
import shutil
import os
import json

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
        """The toolbox definition."""
        self.label = "DynamicPage Tools"
        self.alias = "dynamicPageTools"
        # List of tool classes associated with this toolbox
        self.tools = [MapGenerator]


class MapGenerator(object):
    """ Class that contains the code to generate a new map
        based off the input AOI"""
    def __init__(self):
        """The tool definition."""
        self.label = "Generate Map"
        self.description = "Python Script used to create a new map for the Dynamic Page product"
        self.canRunInBackground = False

        # Path to the ArcGIS Server output directory
        self.outputdirectory = Utilities.output_directory
        # Path to POD product folder
        self.shared_prod_path = Utilities.shared_products_path

    def getParameterInfo(self):
        """Set parameter definitions"""
        product_as_json = arcpy.Parameter(name="product_as_json",
                                          displayName="Product As JSON",
                                          direction="Input",
                                          datatype="GPString",
                                          parameterType="Required")

        output_file = arcpy.Parameter(name="output_file",
                                      displayName="Output File",
                                      direction="Output",
                                      datatype="GPString",
                                      parameterType="Derived")

        params = [product_as_json, output_file]
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

    def execute(self, parameters, messages):
        """The source code of the tool."""
        try:
            arcpy.env.overwriteOutput = True

            # Make sure the output directory exists
            if arcpy.Exists(self.outputdirectory) != True:
                arcpy.AddError(self.outputdirectory + " doesn't exist")
                raise arcpy.ExecuteError

            # Paths to the ArcGIS scratch workspaces
            scratch_folder = arcpy.env.scratchFolder

            # Get the inputs
            product_json = parameters[0].value
            product = json.loads(product_json)
            product = Utilities.DictToObject(product)

            product_name = product.productName
            map_name = product.customName
            if map_name == "":
                map_name = product.mapSheetName

            # Validate AOI
            if product.geometry == "":
                arcpy.AddError("Geometry Object can't be NULL.")
                raise arcpy.ExecuteError
            aoi = arcpy.AsShape(json.dumps(product.geometry), True)

            # Get page size
            page_id, orientation, page_width, page_height, units = Utilities.get_page_size(product.pageSize)

            # Get page margin in page_units
            top, right, bottom, left, margin_units = Utilities.get_page_margin(product.pageMargin, units)

            # User defined variables for the template map
            product_location = os.path.join(self.shared_prod_path, product_name)
            mxd_path = os.path.join(product_location, product.mxd)

            # Validation check
            if arcpy.Exists(mxd_path) != True:
                arcpy.AddError(map_name + " doesn't exist at " + os.path.join(self.shared_prod_path, product_name) + ".")
                raise arcpy.ExecuteError

            map_doc_name = map_name + "_" + Utilities.get_date_time()
            arcpy.AddMessage("Creating the map for the " + map_name + " AOI...")
            final_mxd_path = arcpy.CreateUniqueName(product.mxd, scratch_folder)
            shutil.copy(mxd_path, final_mxd_path)

            # Identify the largest data frame to update
            final_mxd = arcpy.mapping.MapDocument(final_mxd_path)
            data_frame = Utilities.get_largest_data_frame(final_mxd)

            # Grid xml
            non_zipper_xml = product.gridXml
            grid_xml = os.path.join(self.shared_prod_path, product_name, non_zipper_xml)
            if arcpy.Exists(grid_xml) != True:
                arcpy.AddError(non_zipper_xml + " doesn't exist at " + os.path.join(self.shared_prod_path, product_name) + ".")
                raise arcpy.ExecuteError

            final_mxd.activeView = 'PAGE_LAYOUT'
            arcpyproduction.mapping.SetPageSize(final_mxd, page_id, orientation,
                                                page_width, page_height,
                                                units)

            # Create grid on disk at map scale
            grid = arcpyproduction.mapping.Grid(grid_xml)
            grid.scale = product.scale
            grid.updateDataFrameProperties(data_frame, aoi)

            # Set the data frame position based on page margin
            if margin_units.upper() == "PERCENT":
                left = page_width * left * 0.01
                bottom = page_height * bottom * 0.01

            data_frame.elementPositionX = left
            data_frame.elementPositionY = bottom

            # Update any dynamic text in the map
            title_elem = arcpy.mapping.ListLayoutElements(final_mxd, "", "Map_Name")[0]
            title_elem.text = map_name

            data_elem = arcpy.mapping.ListLayoutElements(final_mxd, "", "Data_Text")[0]
            text = data_elem.text
            data_elem.text = text.replace("PageDimensions", "Page Dimensions: {}x{},{}".format(page_width, page_height, units.upper()))

            # Apply layout rules
            layout_xml = product.layoutrulesXML
            layout_xml_path = os.path.join(self.shared_prod_path, product_name, layout_xml)
            if arcpy.Exists(layout_xml_path) != True:
                arcpy.AddError(layout_xml + " doesn't exist at " + os.path.join(self.shared_prod_path, product_name) + ".")
                raise arcpy.ExecuteError

            arcpyproduction.mapping.ApplyLayoutRules(final_mxd, layout_xml_path)
            arcpy.AddMessage("Applied layout rules using {}".format(layout_xml_path))

            # Add border to the main data frame
            b_elem = arcpy.mapping.ListLayoutElements(final_mxd, "", "Df_Border")[0]
            b_elem.elementPositionX = data_frame.elementPositionX
            b_elem.elementPositionY = data_frame.elementPositionY
            b_elem.elementWidth = data_frame.elementWidth
            b_elem.elementHeight = data_frame.elementHeight

            # Finalize map document and export
            arcpy.RefreshActiveView()
            arcpy.RefreshTOC()

            arcpy.AddMessage("Finalizing the map document...")
            if product.exportOption == 'Preview':
                preview_name = "_ags_" + map_doc_name + "_preview.jpg"
                preview_path = os.path.join(self.outputdirectory, preview_name)
                arcpy.mapping.ExportToJPEG(final_mxd,
                                           preview_path,
                                           resolution=96,
                                           jpeg_quality=50)
                parameters[1].value = preview_name

            elif product.exportOption == 'Export':
                file_name = Utilities.export_map_document(product_location,
                                                          final_mxd,
                                                          map_doc_name,
                                                          data_frame,
                                                          self.outputdirectory,
                                                          product.exporter)

                arcpy.AddMessage("exported")
                parameters[1].value = file_name

            del final_mxd

            return

        except arcpy.ExecuteError:
            arcpy.AddError(arcpy.GetMessages(2))
        except SystemError:
            arcpy.AddError("System Error: " + sys.exc_info()[0])
        except Exception as ex:
            arcpy.AddError("Unexpected Error: " + ex.message)

# For Debugging Python Toolbox Scripts
# comment out when running in ArcMap
#def main():
    #tbx = Toolbox()
    #tool = MapGenerator()
    #tool.execute(tool.getParameterInfo(), None)

#if __name__ == "__main__":
    #main()
