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

"""Utilities file for use by multiple POD scripts"""

import arcpy
import arcpyproduction
import os
import datetime
import traceback

# Path to the Products folder
shared_products_path = r"\\<yourServer>\arcgisserver\MCS_POD\Products"

# Path to the ArcGIS Server output directory
output_directory = r"\\<yourServer>\arcgisserver\directories\arcgisoutput"
output_url = r"http://<yourServer>/arcgis/rest/directories/arcgisoutput/"

def get_largest_data_frame(mxd):
    """Returns the largest data frame from mxd"""
    data_frame_list = arcpy.mapping.ListDataFrames(mxd)
    area = 0
    for df in data_frame_list:
        if area < df.elementWidth * df.elementHeight:
            area = df.elementWidth * df.elementHeight
            data_frame = df
    return data_frame

def get_date_time():
    """Returns the current date and time"""
    date = datetime.datetime.now()
    return date.strftime("%m%d%Y_%H%M%S")

def get_page_size(page_size):
    """Parses the input page size string and returns a Python
    dictionary containing page size, dimensions and units for
    standard Esri and custom page sizes defined in the podconfig file."""

    try:
        assert page_size, "Invalid parameter: page_size"
        std_page_sizes = {'LETTER':'8.5x11',
                          'LEGAL':'8.5x14',
                          'TABLOID':'11x17',
                          'A5':'5.83x8.27',
                          'A4':'8.27x11.69',
                          'A3':'11.69x16.54',
                          'A2':'16.54x23.39',
                          'A1':'23.39x33.11',
                          'A0':'33.11x46.8',
                          'C':'17x22',
                          'D':'22x34',
                          'E':'34x44'}

        page = page_size.split()
        page_id = page[0].upper()
        orientation = page[1].upper()
        units = 'INCHES'

        # Custom page sizes
        if len(page) > 2:
            page_id = 'CUSTOM'
            width = float(page[2])
            height = float(page[3])
            if len(page) == 5:
                units = page[4]
        else:
            # Standard Esri page sizes
            assert std_page_sizes.has_key(page_id), "Unsupported page size" + page_id
            size = std_page_sizes.get(page_id)
            width = float(size.split('x')[0])
            height = float(size.split('x')[1])
            if orientation == 'LANDSCAPE':
                width = float(size.split('x')[1])
                height = float(size.split('x')[0])

        return (page_id, orientation, width, height, units)

    except arcpy.ExecuteError:
        arcpy.AddError(arcpy.GetMessages(2))
    except Exception as ex:
        arcpy.AddError(ex.message)
        tb = sys.exc_info()[2]
        tbinfo = traceback.format_tb(tb)[0]
        arcpy.AddError("Traceback info:\n" + tbinfo)

def get_page_margin(margin_size, output_units=None):
    """Parses the input margin string and returns a Python
    dictionary containing margin and units."""
    assert margin_size, "Invalid parameter: margin_size"
    margin = margin_size.split()

    length = len(margin)
    assert length <= 5, "Invalid parameter: margin_size"

    units = "INCHES"
    try:
        float(margin[length - 1])
    except:
        units = margin[length - 1].upper()

    margin_size = []
    for idx in range(length):
        try:
            margin_size.append(float(margin[idx]))
        except:
            pass

    if units != "INCHES" and units != "MILLIMETERS" and units != "CENTIMETERS" and units != "POINTS" and units != "PERCENT":
        units = "INCHES"

    top = right = bottom = left = 0
    length = len(margin_size)
    if length == 1:
        top = right = bottom = left = margin_size[0]

    elif length == 2:
        top = bottom = margin_size[0]
        right = left = margin_size[1]

    elif length == 3:
        top = margin_size[0]
        right = margin_size[1]
        bottom = margin_size[2]
        left = right

    else:
        top = margin_size[0]
        right = margin_size[1]
        bottom = margin_size[2]
        left = margin_size[3]

    if units.upper() != "PERCENT" and output_units and str(output_units).upper() != units.upper():
        top = convert_units(top, units, output_units)
        right = convert_units(right, units, output_units)
        bottom = convert_units(bottom, units, output_units)
        left = convert_units(left, units, output_units)
        units = output_units

    return (top, right, bottom, left, units)

def get_margined_page_size(page_width, page_height, page_units, margin_top,
                            margin_right, margin_bottom, margin_left,
                            margin_units):
    top = margin_top
    right = margin_right
    bottom = margin_bottom
    left = margin_left

    if margin_units.upper() == "PERCENT":
        top = page_height * margin_top * 0.01
        left = page_width * margin_left * 0.01
        bottom = page_height * margin_bottom * 0.01
        right = page_width * margin_right * 0.01

    elif page_units.upper() != margin_units.upper():
        top = convert_units(top, margin_units, page_units)
        right = convert_units(right, margin_units, page_units)
        bottom = convert_units(bottom, margin_units, page_units)
        left = convert_units(left, margin_units, page_units)

    margined_page_width = page_width - left - right
    margined_page_height = page_height - top - bottom

    return (margined_page_width, margined_page_height)


def convert_units(value, from_units, to_units):
    if value == 0.0:
        return value

    from_units = from_units.upper()
    to_units = to_units.upper()

    if from_units == to_units:
        return value

    # Convert to inches
    k = 0.03937
    kret = k
    if from_units == "CENTIMETERS":
        kret = k * 10
    elif from_units == "INCHES":
        kret = 1
    elif from_units == "POINTS":
        kret = 1 / 72.0

    retValue = value * kret

    # Convert from inches
    if to_units == "INCHES":
        return retValue
    elif to_units == "MILLIMETERS":
        kret = 1 / k
    elif to_units == "CENTIMETERS":
        kret = 1 / (10 * k)
    else:
        kret = 72.0

    return retValue * kret


def export_map_document(product_location, mxd, map_doc_name, data_frame,
                        outputdirectory, export_type):
    """Exports MXD to chosen file type"""

    try:
        export = export_type.upper()

        if export == "PDF":
            filename = "_ags_" + map_doc_name  + ".pdf"
            outfile = os.path.join(outputdirectory, filename)

            # Export to PDF optional parameters
            data_frame = "PAGE_LAYOUT"
            df_export_width = 640
            df_export_height = 480
            resolution = 300
            image_quality = "BEST"
            colorspace = "RGB"
            compress_vectors = True
            image_compression = "ADAPTIVE"
            picture_symbol = "RASTERIZE_BITMAP"
            convert_markers = False
            embed_fonts = True
            layers_attributes = "LAYERS_ONLY"
            georef_info = True
            jpeg_compression_quality = 80

            # Run the export tool
            arcpy.mapping.ExportToPDF(mxd, outfile, data_frame, df_export_width,
                                      df_export_height, resolution,
                                      image_quality, colorspace,
                                      compress_vectors, image_compression,
                                      picture_symbol, convert_markers,
                                      embed_fonts, layers_attributes,
                                      georef_info, jpeg_compression_quality)
            arcpy.AddMessage("PDF is located: " + outfile)
            arcpy.AddMessage(filename)
            return filename

        elif export == 'JPEG':
            filename = "_ags_" + map_doc_name  + ".jpg"
            outfile = os.path.join(outputdirectory, filename)

            # Export to JEPG optional parameters
            data_frame = "PAGE_LAYOUT"
            df_export_width = 640
            df_export_height = 480
            resolution = 96
            world_file = False
            color_mode = "24-BIT_TRUE_COLOR"
            jpeg_quality = 100
            progressive = False

            # Run the export tool
            arcpy.mapping.ExportToJPEG(mxd, outfile, data_frame,
                                       df_export_width, df_export_height,
                                       resolution, world_file, color_mode,
                                       jpeg_quality, progressive)

            arcpy.AddMessage("JPEG is located: " + outfile)
            return filename

        elif export == 'TIFF':
            filename = "_ags_" + map_doc_name  + ".tif"
            outfile = os.path.join(outputdirectory, filename)

            # Export to JPEG optional parameters
            data_frame = "PAGE_LAYOUT"
            df_export_width = 640
            df_export_height = 480
            resolution = 96
            world_file = False
            color_mode = "24-BIT_TRUE_COLOR"
            tiff_compression = "LZW"

            # Run the export tool
            arcpy.mapping.ExportToTIFF(mxd, outfile, data_frame,
                                       df_export_width, df_export_height,
                                       resolution, world_file, color_mode,
                                       tiff_compression)
            arcpy.AddMessage("TIFF is located: " + outfile)
            return filename

        elif export == "MAP PACKAGE":
            filename = "_ags_" + map_doc_name + ".mpk"
            outfile = os.path.join(outputdirectory, filename)
            dfextent = data_frame.extent
            mxd = mxd.filePath
            arcpy.AddMessage(mxd)

            # Export to MPK optional parameters
            convert_data = "CONVERT"
            convert_arcsde_data = "CONVERT_ARCSDE"
            apply_extent_to_arcsde = "ALL"
            arcgisruntime = "DESKTOP"
            reference_all_data = "NOT_REFERENCED"
            version = "ALL"

            # Run the export tool
            arcpy.PackageMap_management(mxd, outfile, convert_data,
                                        convert_arcsde_data, dfextent,
                                        apply_extent_to_arcsde, arcgisruntime,
                                        reference_all_data, version)
            arcpy.AddMessage("MPK is located: " + outfile)
            return filename

        elif export == 'LAYOUT GEOTIFF':
            filename = "_ags_" + map_doc_name  + ".tif"
            outfile = os.path.join(outputdirectory, filename)

            # Export to Layout GeoTIFF optional parameters:
            resolution = 96
            world_file = False
            color_mode = "24-BIT_TRUE_COLOR"
            tiff_compression = "LZW"

            # Run the export tool
            arcpyproduction.mapping.ExportToLayoutGeoTIFF(mxd, outfile,
                                                          data_frame,
                                                          resolution,
                                                          world_file,
                                                          color_mode,
                                                          tiff_compression)
            arcpy.AddMessage("Layout GeoTIFF is located: " + outfile)
            return filename

        elif export == 'PRODUCTION PDF' or export == 'MULTI-PAGE PDF':
            filename = "_ags_" + map_doc_name  + ".pdf"
            outfile = os.path.join(outputdirectory, filename)
            setting_file = os.path.join(product_location, "colormap.xml")

            if os.path.exists(setting_file) == True:
                arcpyproduction.mapping.ExportToProductionPDF(mxd, outfile,
                                                              setting_file)
            else:
                arcpy.AddError("Color mapping rules file doesn't exist, using "
                               "standard ExportToPDF exporter with default "
                               "settings.")

            arcpy.AddMessage("Production PDF is located: " + outfile)
            return filename

        else:
            arcpy.AddError("The exporter : " + export + " is not supported, "
                           "please contact your system administrator.")

    except arcpy.ExecuteError:
        arcpy.AddError(arcpy.GetMessages(2))
    except Exception as ex:
        arcpy.AddError(ex.message)
        tb = sys.exc_info()[2]
        tbinfo = traceback.format_tb(tb)[0]
        arcpy.AddError("Traceback info:\n" + tbinfo)

class DictToObject(dict):
    """Convert dictionary into class"""
    def __init__(self, *args, **kwargs):
        dict.__init__(self, *args, **kwargs)
    def __getattr__(self, name):
        return self[name]
    def __setattr__(self, name, value):
        self[name] = value
