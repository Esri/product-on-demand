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

import arcpy
import arcpyproduction
import os
import sys
import json
import shutil
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
    def __init__(self):
        """Define the toolbox (the name of the toolbox is the name of the
        .pyt file)."""
        self.label = "POD MapGenerator"
        self.alias = "podMapGenerator"

        # List of tool classes associated with this toolbox
        self.tools = [PODMapGenerator]


class PODMapGenerator(object):
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "Generate Map"
        self.description = "Python Script used to create a new map"
        self.canRunInBackground = False
        #Path to the AGS Output Directory
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
        return True

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

            # Check if the output directory exists
            if arcpy.Exists(self.outputdirectory) != True:
                arcpy.AddError(self.outputdirectory + " doesn't exist")
                raise arcpy.ExecuteError

            # Paths to the ArcGIS scratch workspaces
            scratch_folder = arcpy.env.scratchFolder

            # Extract the product info from the product json
            product_json = parameters[0].value
            product_json = '{"productName":"Starter Product","makeMapScript":"POD_MapGenerator.pyt","mxd":"Fixed25K.mxd","gridXml":"INT2_E.xml","pageMargin":"1.5 1 1.5 1 INCHES","exporter":"PDF","exportOption":"Preview","geometry":{"rings":[[[-13700203.080672747,6205418.832837948],[-13700203.080672747,6234227.038648733],[-13674970.02470276,6234227.038648733],[-13674970.02470276,6205418.832837948],[-13700203.080672747,6205418.832837948]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":25000,"pageSize":"A3 PORTRAIT","toolName":"MapGenerator","mapSheetName":"Starter Product_0","customName":""}'
            product = json.loads(product_json)
            product = Utilities.DictToObject(product)

            product_name = product.productName
            # User defined variables for the template map
            product_location = os.path.join(self.shared_prod_path, product_name)
            mxd_path = os.path.join(product_location, product.mxd)
            map_name = product.customName
            if map_name == "":
                map_name = product.mapSheetName

            # Get the geometry of the area from product json
            if product.geometry == "":
                arcpy.AddError("Geometry Object can't be NULL.")
                raise arcpy.ExecuteError
            aoi = arcpy.AsShape(json.dumps(product.geometry), True)

            # Get the map document
            final_mxd_path = arcpy.CreateUniqueName(product.mxd, scratch_folder)
            shutil.copy(mxd_path, final_mxd_path)
            mxd = arcpy.mapping.MapDocument(mxd_path)
            if mxd.relativePaths == True:
                mxd.relativePaths = False
                mxd.saveACopy(final_mxd_path)
            else:
                shutil.copy(mxd_path, final_mxd_path)
            
            final_mxd = arcpy.mapping.MapDocument(final_mxd_path)


            # Identify the largest dataframe to update
            data_frame = Utilities.get_largest_data_frame(final_mxd)

           # Get page size
            page_id, orientation, page_width, page_height, units = Utilities.get_page_size(product.pageSize)
            
            # Get page margin in page_units
            top, right, bottom, left, margin_units = Utilities.get_page_margin(product.pageMargin, units)

            # Set the map to correct page size
            final_mxd.activeView = 'PAGE_LAYOUT'
            arcpyproduction.mapping.SetPageSize(final_mxd, page_id, orientation,
                                                page_width, page_height, units)
            

            scratch_gdb = arcpy.env.scratchGDB
            arcpy.AddMessage("rotation:"+str(product.angle))

            # Create abstract grid
            grid_xml = os.path.join(self.shared_prod_path, product_name, product.gridXml)
            gridX = arcpyproduction.mapping.Grid(grid_xml)
            #gridX.scale = product.scale #commented till workaround is in place
            #gridX.updateDataFrameProperties(data_frame, aoi) #commented till workaround is in place

            # Create grid on disk workaround till rotation is exposed to grid object
            base_sr = gridX.baseSpatialReference
            grid_gcs = base_sr.GCS
            result2 = arcpy.CreateFeatureDataset_management(scratch_gdb,"grid_fds",grid_gcs)
            gfds = result2.getOutput(0)
            arcpy.MakeGridsAndGraticulesLayer_cartography(grid_xml, aoi, gfds, "grid_layer", 
                                                          name = map_name,
                                                          refscale = product.scale,
                                                          rotation = new_rotation)
            grid = arcpyproduction.mapping.ListGrids(gfds,map_name)[0]
            grid.updateDataFrameProperties(data_frame)#, aoi)	
            #arcpy.AddMessage("grid applied"+grid.name)
            #overriding mask created by update dataframe properties, 
            #otherwise dataframe size is bigger than aoi esp for rotated aois
            df_width, df_height = Utilities.get_margined_page_size(page_width, page_height, units, 
                                                                    top, right, bottom, left, margin_units)
            data_frame.elementWidth = df_width
            data_frame.elementHeight = df_height
            arcpy.Delete_management(gfds)

            # Implement your own custom logic here to prepare the map. For
            # example you could add additional data, update elements, and
            # symbolize layers.

            # Export or Preview map using POD Utilities and set output value
            arcpy.RefreshActiveView()
            arcpy.RefreshTOC()
            map_doc_name = map_name + "_" + Utilities.get_date_time()
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
                parameters[1].value = file_name

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
def main():
    arcpy.CheckOutExtension('foundation')
    tbx = Toolbox()
    tool = PODMapGenerator()
    tool.execute(tool.getParameterInfo(), None)

if __name__ == "__main__":
    main()
