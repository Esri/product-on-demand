/*
 | Copyright 2015 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

define({
    podConfig: {
        applicationTitle: "ArcGIS Server 生产制图",
        applicationSubtitle: "产品需求(POD): 矢量页面地图",
        splashTitle: "POD 示范应用程序",
        splashText: "这是一个示范站点为ESRI的产品按需示例应用程序。此页面上的功能可能会更改，恕不警告，它不适合生产使用。",
        splashEmail: "pm_carto_external@esri.com",
        splashEmailDesc: "需要更多信息请发电子邮件",
        splashEmailAlias: "Esri Production Mapping Team",
        splashWebsite: "http://www.esri.com/software/arcgis/extensions/production-mapping",
        splashWebsiteDesc: "访问我们的网站",
        splashDoNotShow: "下次不在显示",
        userGuideLink: "用户指南",
        mapServicesLink: "换图层",        
        pageSizeList: {
            tooltip_A0: "A0 (33.1英寸 x 46.8英寸)",
            tooltip_A1: "A1 (23.39英寸 x 33.11英寸)",
            tooltip_A2: "A2 (16.54英寸 x 23.39英寸)",
            tooltip_A3: "A3 (11.69英寸 x 16.54英寸)",
            tooltip_A4: "A4 (8.27英寸 x 11.69英寸)",
            tooltip_A5: "A5 (5.83英寸 x8.27英寸)",
            tooltip_ANSI_C: "ANSI C (17英寸 x 22英寸)",
            tooltip_ANSI_D: "ANSI D (22英寸 x 34英寸)",
            tooltip_ANSI_E: "ANSI E (34英寸 x 44英寸)",
            tooltip_LETTER: "Letter (8.5英寸 x 11英寸)",
            tooltip_LEGAL: "Legal (8.5英寸 x 14英寸)",
            tooltip_TABLOID: "Tabloid (11英寸 x 17英寸)",
            tooltip_CUSTOM_32_44: "Custom Size （32*44 厘米）",
            tooltip_CUSTOM_63_88: "Custom Size （63*88 厘米）"            
        },
        mapCommands: {
            displayName_zoomIn: "放大",
            displayName_zoomOut: "缩小",
            displayName_pan: "移动",
            displayName_selectPoint: "用点选择现有区域",
            displayName_extentPoint: "用点创建新的区域",
            displayName_selectPolyline: "用折线选择现有区域",
            displayName_extentPolyline: "用折线创建新的区域",
            displayName_selectPolygon: "用多边形选择现有区域",
            displayName_extentPolygon: "用多边形创建新的区域",
            displayName_extentMove: "移动区域",
            displayName_zoomTo: "缩放到区域图层",
            displayName_clearSelected: "清除选定区域",
            displayName_clearAll: "清除所有区域",
            tooltip_zoomIn: "放大",
            tooltip_zoomOut: "缩小",
            tooltip_pan: "移动",
            tooltip_selectPoint: "用点从现有图层选择区域",
            tooltip_extentPoint: "创建新的区域",
            tooltip_selectPolyline: "用折线从现有图层选择区域",
            tooltip_extentPolyline: "用折线创建新的区域",
            tooltip_selectPolygon: "用多边形从现有图层选择区域",
            tooltip_extentPolygon: "用多边形创建新的区域",
            tooltip_extentMove: "移动定制区域",
            tooltip_zoomTo: "缩放到区域图层",
            tooltip_clearSelected: "清除选定区域",
            tooltip_clearAll: "清除所有区域"
        },
        attrsDisplayName: {
            product: "产品名称",
            description: "产品描述",
            extentLayer: "制图区域",
            exporter: "输出格式",
            mapSheetName: "地图名称",
            customName: "定制名称",
            pageSize: "纸张尺寸",
            scale: "比例尺",
            orientation: "布局",
            width: "宽度",
            height: "高度",
            units: "单位"
        }
    },
    configurationManager: {
        syntaxError: "配置文件有一些语法错误。",
        propertyMessage: "属性 : ${propertyName}\n信息 :  ${propertyMsg}",
        domainNotDefinited: "ProductTypes[${propertyName}] 指向 domain '${domainName}' 没有定义。",
        domainValueInvalid: "${domainName}.value 是 (${domainValue}) 但它应该是一个特殊的分离器值 (-)",
        basemapLayerInvalid: "AppLevelSettings.defaultBasemapLayer (${basemapLayer}) 不属于: BasemapLayers[].value",
        tableNotDefined: "${productname}.attrTable 引用的属性表 (${tableName}) 没有定义",
        headE: "已检测站点配置脚本错误。\n请保存此消息并联系网站管理员。\n\n",
        headW: "站点配置问题或者服务器关闭。\n如果经常出现，请出示此消息给网站管理员。\n\n",
        stopped: "停止配置错误后执行: ${errorMsg}\n\n",
        alreadyStopped: "已经停止:\n\n",
        passToServerRedefined: "passToServer 重新定义",
        valueNotDefined: "'${message}' 没有定义。",
        valueNotExpected: "'${message}' 是类型 '${variableType}', 而预期值'${expectedType}'",
        tooManyDefined: "${message} 定义了太多的值。",
        unknownUnits: "${message} 指定未知的测量单位。",
        invalidNumber: "${message} 指定不正确的数值: ${number}",
        tableDomainNotDefined: "${tableName}[${id}].domain 指向 domain (${domainName}) 没有定义。",
        tableInvalidValue: "${tableName}['${id}'].value (${value}) 不属于: ${domainName}[].value",
        propertyNotFound: "Attribute ${attributeName} 指向属性 ${propertyName}.${fieldName} 没有找到。",
        settingNotDefined: "所请求的设置 (${settingName}) 未在配置文件中定义。"
    },
    podExport: {
        invalidNames: "输出表有无效的产品名称:\n\n ${invalidNames}\n",
        duplicateNames: "输出表有重复的产品名称:\n ${duplicateNames}\n",
        needFix: "输出之前，请修复这些名称。",
        exportNames: "请查看以下产品输出阶段:\n\n ${exportNames}",
        confirm: "\n你想继续新的输出作业?",
        unassignedJob: "断言失败:\n\n输出作业已完成，但没有分配JOBID。",
        unknownJob: "断言失败:\n\n输出作业已完成，但含有未知JOBID。",
        unknownMessage: "断言失败:\n\n未知输出完成消息 (${jobStatus})。",
        succeededMessage: " 输出成功",
        failedMessage: "输出失败",
        fileNotExist: "文件不再存在。请再次输出地图。",
        checkConnection: "请检查您的Internet连接 (状态代码 ${linkStatus})。",
        openInNewWindow: "弹出窗口可能被浏览器阻止。 右键单击该链接并选择'在新窗口中打开链接'。",
        exportError: "断言失败:\n\nExporter.setExportContentDiv() 输出过程开始后不存在。"
    },
    podLayerList: {
        defaultTitle: "请选择一个产品来激活该控制。",
        restrictTitle: "仅可查看。\n管理员禁用修改。",
        basemapUncheckTitle: "这一图层 (${layerName}) 是当前底图层，它不能被选中。",
        layerUnckeckTitle: "这一图层 (${layerName}) 是当前制图区域层，它不能被选中。",
        vasibilityChange: "断言失败:\n\n当没有产品被选择时，图层的可见性无法改变 (product == null)。",
        noValueChange: "断言失败:\n\n相同的值 (${newValue}) 正在被图层的网格单元所使用。"
    },
    podMap: {
        layerLoading: "断言失败:\n\n被添加的图层 (${layerName}) 已经处于加载状态。",
        layerNotInMap: "断言失败:\n\n被添加的图层 (${layerName}) 不在地图上，但处于加载状态。",
        layerNotVisible: "断言失败:\n\n被同步的动态图层 (${layerName}) 是不可见的。",
        layerNonVisible: "断言失败:\n\n当前区域层 (${layerName}) 在图层列表被标记不可见。",
        layerNotMatch: "断言失败:\n\n当前底图图层 (${basemapID}) 和与产品相关的图层 (${layerID}) 不匹配。"
    },
    productFactory: {
        title: "选择产品..."
    },
    productPanel: {
        productPanelTitle: "输出序列",
        exportButtonLabel: "输出产品",
        deleteSelectedProduct: "您确定要删除选中的产品?",
        deleteAllProduct: "您确定要删除所有产品?",
        nothingToExport: "没有产品输出.\n" +
            "请先添加一些产品到出口列表:\n\n" +
            "- 点击 '选择产品...' 图标，在对话框中选择一个产品;\n" +
            "- 点击 '选择工具...' 图标，然后在对话框中选择一种工具;\n" +
            "- 在地图点击或绘制选择范围.",
        selectToExport: "请最多选择 ${maxProducts} 产品输出.\n\n点击选择多个产品时按住Ctrl.",
        confirmAllExport: "将输出列表中的所有产品.",
        confirmSelectedExport: "${maxProducts} 个选中的产品中，只有第一个将输出."
    },
    search: {
        searchHint: "地理位置搜索...",
        unexpectedResponse: "来自服务器的意外响应:\n\n 结果名称 = ${paramName} (预期 'out_extent')",
        noItemFound: "没有找到"
    },
    selectionTool: {
        noFeaturePresented: "没有地理要素存在于指定区域.\n\r请在一个有地理要素的区域点击，然后使用 '移动区域'' 工具调整位置.",
        invalidOperation: "断言失败:\n\n该选择操作仅适用于一个固定区域产品的定制AOI.",
        invalidOperationForNonFixed: "该选择操作是仅适用于固定区域产品.",
        selectionTooLarge: "选择过多，无法通过服务器进行处理。 选定的地理要素数量 ${featureCount}.",
        areaNoSpecified: "未指定区域",
        unexpectedResponse: "来自服务器的意外响应:\n\n 结果名称 = ${paramName} (预期 'out_extent')",
        needTwoPoints: "至少需要两个不同的点来创建路径.",
        selectExtentTooltip: "选择移动的区域",
        invalidOperationForFixed: "移动操作只适用于非固定区域产品.",
        moveExtentTooltip: "选择移动的区域",
        selectProduct: "断言失败:\n\n选择一个产品前，请点击选择'选择产品...'图标。"
    },
    toolbox: {
        title: "选择工具..."
    }

});