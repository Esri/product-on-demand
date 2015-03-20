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

"""This Python Toolbox contains multiple scripts used by MCS_POD"""
import os
import sys
import json
import arcpy
import traceback
from urlparse import urljoin

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
    """Toolbox class"""
    def __init__(self):
        """Define the toolbox (the name of the toolbox is the name of the
        .pyt file)."""
        self.label = "POD Tools"
        self.alias = "podTools"

        # List of tool classes associated with this toolbox
        self.tools = [Gateway]

class Gateway(object):
    """Parses array from POD"""
    def __init__(self):
        """Define the tool (tool name is the name of the class)."""
        self.label = "Gateway"
        self.description = "This script parses the array from the POD app and batch processes all the AOIs."
        self.canRunInBackground = False

    def getParameterInfo(self):
        """Set parameter definitions"""
        # Input parameter
        products_as_json = arcpy.Parameter(displayName="Products As JSON",
                                           name="products_as_json",
                                           datatype="GPString",
                                           parameterType="Required",
                                           direction="Input")
        # Output parameter
        output_files = arcpy.Parameter(displayName="Output Files",
                                       name="output_files",
                                       datatype="GPString",
                                       parameterType="Derived",
                                       direction="Output")

        params = [products_as_json, output_files]
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
        #arcpy.AddMessage(SCRIPTSDIRECTORY)
        arcpy.env.overwriteOutput = True

        # uncomment code for debugging in python IDEs
        #arcpy.CheckOutExtension('foundation')
        #products_json = '[{"productName":"Fixed 25K","makeMapScript":"Fixed25K_MapGenerator.pyt","mxd":"CTM25KTemplate.mxd","gridXml":"CTM_UTM_WGS84_grid.xml","pageMargin":"0","exporter":"PDF","exportOption":"Export","geometry":{"rings":[[[-12453869.342059966,4975537.2444955213],[-12453869.343173161,4993922.5250767013],[-12439954.404041013,4993922.5265489109],[-12439954.402927818,4975537.2459649593],[-12453869.342059966,4975537.2444955213]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":500000,"pageSize":"LETTER PORTRAIT","toolName":"MapGenerator","quad_id":404511145,"mapSheetName":"Fort Douglas","customName":""}]'
        #products_json = '[{"productName":"Fixed 25K","makeMapScript":"Fixed25K.pyt","mxd":"CTM25KTemplate.mxd","gridXml":"CTM_UTM_WGS84_grid.xml","pageMargin":"0","exporter":"PDF","exportOption":"Export","geometry":{"rings":[[[-12453869.338275107,4938870.05400884],[-12453869.339388302,4957186.4929140275],[-12439954.400256153,4957186.4943807106],[-12439954.399142958,4938870.0554727865],[-12453869.338275107,4938870.05400884]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":500000,"pageSize":"LETTER PORTRAIT", "toolName":"MapGenerator","mapSheetName":"Draper","customName":"", "exportOption": "Export"}, {"productName":"Fixed 25K","makeMapScript":"Fixed25K.pyt","mxd":"CTM25KTemplate.mxd","gridXml":"CTM_UTM_WGS84_grid.xml","pageMargin":"0","exporter":"Multi-page PDF","exportOption":"Export","geometry":{"rings":[[[-12453869.338275107,4938870.05400884],[-12453869.339388302,4957186.4929140275],[-12439954.400256153,4957186.4943807106],[-12439954.399142958,4938870.0554727865],[-12453869.338275107,4938870.05400884]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":500000,"pageSize":"LETTER PORTRAIT","mapSheetName":"Draper","customName":"", "exportOption": "Export"}, {"productName":"Fixed 25K","makeMapScript":"Fixed25K.pyt","mxd":"CTM25KTemplate.mxd","gridXml":"CTM_UTM_WGS84_grid.xml","pageMargin":"0","exporter":"Multi-page PDF","exportOption":"Export","geometry":{"rings":[[[-12453869.338275107,4938870.05400884],[-12453869.339388302,4957186.4929140275],[-12439954.400256153,4957186.4943807106],[-12439954.399142958,4938870.0554727865],[-12453869.338275107,4938870.05400884]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":500000,"pageSize":"LETTER PORTRAIT","mapSheetName":"Draper","customName":"", "exportOption": "Export"}, {"productName":"Fixed 25K","makeMapScript":"Fixed25K.pyt","mxd":"CTM25KTemplate.mxd","gridXml":"CTM_UTM_WGS84_grid.xml","pageMargin":"0","exporter":"Multi-page PDF","exportOption":"Export","geometry":{"rings":[[[-12453869.338275107,4938870.05400884],[-12453869.339388302,4957186.4929140275],[-12439954.400256153,4957186.4943807106],[-12439954.399142958,4938870.0554727865],[-12453869.338275107,4938870.05400884]]],"spatialReference":{"wkid":102100,"latestWkid":3857}},"scale":500000,"pageSize":"LETTER PORTRAIT","mapSheetName":"Draper","customName":"", "exportOption": "Export"}]'

        products_json = parameters[0].value
        products = json.loads(products_json)

        agsoutputdirectory = Utilities.output_directory
        podproductspath = Utilities.shared_products_path
        outputurl = Utilities.output_url
        multi_page_pdf_list = []
        output_files = []

        # Getting the date and time
        timestamp = Utilities.get_date_time()

        try:
            for product in products:
                product = Utilities.DictToObject(product)
                if product.mapSheetName == "":
                    arcpy.AddWarning("Map Sheet Name value cannot be null.")
                    arcpy.AddWarning("Setting the Map Sheet Value to 'My_Map'.")
                    product.MapSheetName = "My_Map"
                if product.exporter == "":
                    arcpy.AddWarning("Exporter Name value cannot be null.")
                    arcpy.AddWarning("Setting Exporter Name value to 'ExportToPDF'.")
                makeMapScript_path = os.path.join(podproductspath, product.productName, product.makeMapScript)

                map_name = product.mapSheetName

                tbx = arcpy.ImportToolbox(makeMapScript_path)

                toolname = product.toolName
                arcpy.AddMessage("Running " + toolname + " script for Map Sheet "+ map_name + ".")
                result = getattr(tbx, toolname)(json.dumps(product))

                arcpy.AddMessage("")
                for i in range(0, result.messageCount):
                    arcpy.AddMessage(result.getMessage(i))

                if result.status == 4:  # Export succeeded
                    if product.exporter == "Multi-page PDF":
                        multi_page_pdf_list.append(result.getOutput(0))
                    else:
                        output_files.append(urljoin(outputurl, result.getOutput(0)))
                else:
                    arcpy.AddError(result.getMessages(2))

            # Reassemble multi-page pdf files
            map_book_name = ""
            if multi_page_pdf_list != []:
                map_book_name = "_ags_" + product.productName + "_" + timestamp + ".pdf"
                map_book_path = os.path.join(agsoutputdirectory, map_book_name)

                # Create the file and append pages
                pdfdoc = arcpy.mapping.PDFDocumentCreate(map_book_path)

                for pdf_name in multi_page_pdf_list:
                    pdf_path = os.path.join(agsoutputdirectory, pdf_name)
                    pdfdoc.appendPages(pdf_path)

                pdfdoc.saveAndClose()
                output_files.append(urljoin(outputurl, map_book_name))

                arcpy.AddMessage("Output Files: " + json.dumps(output_files))
            arcpy.AddMessage("Output Files: " + json.dumps(output_files))
            arcpy.SetParameterAsText(1, json.dumps(output_files))

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
    #g = Gateway()
    #par = g.getParameterInfo()
    #g.execute(par, None)

#if __name__ == '__main__':
    #main()
