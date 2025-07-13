sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/m/MessageToast"
], function(Controller, JSONModel, FlattenedDataset, FeedItem, MessageToast) {
	"use strict";

	return Controller.extend("QualityPortal.controller.Dashboard2", {
		onInit: function() {
			this.lotModel = new JSONModel({ results: [] });
			this.getView().setModel(this.lotModel, "lot");
			this.loadIncidentData();
		},

		onLogout: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("View1");
		},

		onNavigateToDashboard1: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("Dashboard1");
		},

		loadIncidentData: function() {
			var that = this;
			var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZEHSM_INC_MGMT_V1_CDS/");
			oModel.read("/ZEHSM_INC_MGMT_V1", {
				success: function(oData) {
					var results = oData.results || [];
					that._processData(results);
				},
				error: function() {
					MessageToast.show("Failed to fetch EHSM incident data.");
				}
			});
		},

		_processData: function(results) {
			var newCount = 0, reviewed = 0, voided = 0;

			for (var i = 0; i < results.length; i++) {
				var item = results[i];
				if (item.IncidentStatus === "NEW") newCount++;
				else if (item.IncidentStatus === "REVIEW COMPLETE" || item.IncidentStatus === "CLOSED") reviewed++;
				else if (item.IncidentStatus === "VOID") voided++;
				item.CreatedOn = item.CreatedOn instanceof Date ? item.CreatedOn : new Date(item.CreatedOn);
			}

			this.getView().getModel("lot").setData({ results: results });
			this.byId("kpiTotalIncidents").setNumber(results.length);
			this.byId("kpiNew").setNumber(newCount);
			this.byId("kpiReviewed").setNumber(reviewed);
			this.byId("kpiVoided").setNumber(voided);

			this._buildCharts(results);
		},

		_buildCharts: function(data) {
			this._buildDonut(this.byId("chart1"), data, "IncidentStatus", "Incident Status Distribution");
			this._buildBar(this.byId("chart2"), data, "IncidentGroup", "Incidents by Group");
			this._buildLine(this.byId("chart3"), data, "CreatedOn", "Monthly Incident Trend");
			this._buildBar(this.byId("chart4"), data, "Location", "Incidents by Location");
		},

		_buildDonut: function(oViz, data, groupField, title) {
			var map = {};
			for (var i = 0; i < data.length; i++) {
				var d = data[i];
				var key = d[groupField] || "Unknown";
				map[key] = (map[key] || 0) + 1;
			}
			var chartData = [];
			for (var label in map) {
				chartData.push({ label: label, value: map[label] });
			}

			oViz.setVizType("donut");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{ name: "Status", value: "{label}" }],
				measures: [{ name: "Count", value: "{value}" }],
				data: { path: "/" }
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({ title: { text: title, visible: true } });
			oViz.removeAllFeeds();
			oViz.addFeed(new FeedItem({ uid: "size", type: "Measure", values: ["Count"] }));
			oViz.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["Status"] }));
		},

		_buildBar: function(oViz, data, groupField, title) {
			var map = {};
			for (var i = 0; i < data.length; i++) {
				var d = data[i];
				var key = d[groupField] || "Unknown";
				map[key] = (map[key] || 0) + 1;
			}
			var chartData = [];
			for (var key in map) {
				chartData.push({ Category: key, Count: map[key] });
			}

			oViz.setVizType("column");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{ name: "Category", value: "{Category}" }],
				measures: [{ name: "Count", value: "{Count}" }],
				data: { path: "/" }
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({ title: { text: title, visible: true } });
			oViz.removeAllFeeds();
			oViz.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Count"] }));
			oViz.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Category"] }));
		},

		_buildLine: function(oViz, data, dateField, title) {
			var map = {};
			for (var i = 0; i < data.length; i++) {
				var d = new Date(data[i][dateField]);
				if (!isNaN(d)) {
					var key = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
					map[key] = (map[key] || 0) + 1;
				}
			}
			var chartData = [];
			for (var k in map) {
				chartData.push({ Period: k, Count: map[k] });
			}
			chartData.sort(function(a, b) {
				return a.Period > b.Period ? 1 : -1;
			});

			oViz.setVizType("line");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{ name: "Period", value: "{Period}" }],
				measures: [{ name: "Count", value: "{Count}" }],
				data: { path: "/" }
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({ title: { text: title, visible: true } });
			oViz.removeAllFeeds();
			oViz.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Count"] }));
			oViz.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Period"] }));
		}
	});
});
