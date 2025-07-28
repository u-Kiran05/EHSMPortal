sap.ui.define(['sap/ui/core/util/MockServer'], function(MockServer) {
    'use strict';
    var oMockServers = [];

    return {
        init: function() {
            var oUriParameters = jQuery.sap.getUriParameters(),
                oManifest = jQuery.sap.syncGetJSON("EHSMPortal/manifest.json").data,
                oDataSources = oManifest["sap.app"].dataSources;

            // simulate each EHSM data source
            Object.keys(oDataSources).forEach(function(key) {
                var oSource = oDataSources[key];
                if (oSource.type === "OData" && oSource.settings && oSource.settings.localUri) {
                    var sMetadataUrl = jQuery.sap.getModulePath(
                        "EHSMPortal/" + oSource.settings.localUri.replace(".xml", ""),
                        ".xml"
                    );
                    var sMockServerUrl = /.*\/$/.test(oSource.uri) ? oSource.uri : oSource.uri + "/";

                    var oMockServer = new MockServer({
                        rootUri: sMockServerUrl
                    });

                    MockServer.config({
                        autoRespond: true,
                        autoRespondAfter: oUriParameters.get("serverDelay") || 1000
                    });

                    oMockServer.simulate(sMetadataUrl, {
                        sMockdataBaseUrl: jQuery.sap.getModulePath("EHSMPortal/localService/mockdata"),
                        bGenerateMissingMockData: true
                    });

                    oMockServer.start();
                    oMockServers.push(oMockServer);
                }
            });

            jQuery.sap.log.info("Running EHSMPortal with mock data");
        },

        getMockServers: function() {
            return oMockServers;
        }
    };
});
