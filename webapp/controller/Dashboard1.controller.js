sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/m/MessageToast"
], function(Controller, JSONModel, FlattenedDataset, FeedItem, MessageToast) {
	"use strict";

	return Controller.extend("QualityPortal.controller.Dashboard1", {

		onNavigateToDashboard2: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("Dashboard2");
		},
		onLogout: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("View1");
		},
		onInit: function() {
			this._loadData();
		},

		_loadData: function() {
			var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZEHSM_RISK_ASMT_V1_CDS/", {
				useBatch: false,
				headers: {
					"X-Requested-With": "XMLHttpRequest"
				}
			});
			var that = this;

			oModel.read("/ZEHSM_RISK_ASMT_V1", {
				success: function(oData) {
					var results = oData.results || [];
					var uniqueMembersMap = {};
					var uniqueRolesMap = {};

					for (var i = 0; i < results.length; i++) {
						if (results[i].AsmtTeamMember) {
							uniqueMembersMap[results[i].AsmtTeamMember] = true;
						}
						if (results[i].Role) {
							uniqueRolesMap[results[i].Role] = true;
						}
					}

					var kpi = {
						total: results.length,
						members: Object.keys(uniqueMembersMap).length,
						roles: Object.keys(uniqueRolesMap).length,
						results: results
					};

					var oJsonModel = new JSONModel(kpi);
					that.getView().setModel(oJsonModel, "risk");

					that._updateBarChart(results);
					that._updateLineChart(results);
				},
				error: function() {
					MessageToast.show("Failed to load risk assessment data.");
				}
			});
		},

		_updateBarChart: function(data) {
			var roleCount = {};
			for (var i = 0; i < data.length; i++) {
				var role = data[i].Role || "Unknown";
				if (!roleCount[role]) {
					roleCount[role] = 0;
				}
				roleCount[role]++;
			}

			var chartData = [];
			for (var roleKey in roleCount) {
				chartData.push({
					Role: roleKey,
					Count: roleCount[roleKey]
				});
			}

			var oViz = this.byId("barChart");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{
					name: "Role",
					value: "{Role}"
				}],
				measures: [{
					name: "Count",
					value: "{Count}"
				}],
				data: {
					path: "/"
				}
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({
				title: {
					text: "Count by Role",
					visible: true
				}
			});
			oViz.removeAllFeeds();
			oViz.addFeed(new FeedItem({
				uid: "valueAxis",
				type: "Measure",
				values: ["Count"]
			}));
			oViz.addFeed(new FeedItem({
				uid: "categoryAxis",
				type: "Dimension",
				values: ["Role"]
			}));
		},

		_updateLineChart: function(data) {
			var timeMap = {};

			for (var i = 0; i < data.length; i++) {
				var dateStr = data[i].CreatedOnAt;
				var reg = data[i].Regulation || "Unknown";
				var timestamp = null;

				if (typeof dateStr === "string" && dateStr.indexOf("/Date(") === 0) {
					var extracted = dateStr.match(/\d+/);
					if (extracted) {
						timestamp = parseInt(extracted[0], 10);
					}
				} else if (typeof dateStr === "number") {
					timestamp = dateStr;
				} else if (dateStr instanceof Date) {
					timestamp = dateStr.getTime();
				}

				if (!timestamp) continue;

				var date = new Date(timestamp);
				if (isNaN(date.getTime())) continue;

				var period = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
				if (!timeMap[period]) {
					timeMap[period] = {};
				}
				if (!timeMap[period][reg]) {
					timeMap[period][reg] = 0;
				}
				timeMap[period][reg]++;
			}

			var periods = Object.keys(timeMap).sort();
			var chartData = [];
			for (var j = 0; j < periods.length; j++) {
				var row = {
					Period: periods[j]
				};
				var regs = timeMap[periods[j]];
				for (var regKey in regs) {
					row[regKey] = regs[regKey];
				}
				chartData.push(row);
			}

			var oViz = this.byId("lineChart");
			oViz.setVizType("line"); // Force line chart type

			var measures = [];
			if (chartData.length > 0) {
				var sample = chartData[0];
				for (var key in sample) {
					if (key !== "Period") {
						measures.push({
							name: key,
							value: "{" + key + "}"
						});
					}
				}
			}

			oViz.setDataset(new FlattenedDataset({
				dimensions: [{
					name: "Period",
					value: "{Period}"
				}],
				measures: measures,
				data: {
					path: "/"
				}
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({
				title: {
					text: "Regulation Over Time",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: false
					}
				},
				legend: {
					isScrollable: true,
					layout: {
						position: "bottom"
					}
				}
			});
			oViz.removeAllFeeds();

			for (var k = 0; k < measures.length; k++) {
				oViz.addFeed(new FeedItem({
					uid: "valueAxis",
					type: "Measure",
					values: [measures[k].name]
				}));
			}

			oViz.addFeed(new FeedItem({
				uid: "categoryAxis",
				type: "Dimension",
				values: ["Period"]
			}));
		}
	});
});