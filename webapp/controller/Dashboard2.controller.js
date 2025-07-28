sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/viz/ui5/controls/Popover",
	"sap/viz/ui5/controls/VizTooltip",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(
	Controller,
	JSONModel,
	FlattenedDataset,
	FeedItem,
	Popover,
	VizTooltip,
	MessageToast, MessageBox
) {
	"use strict";

	return Controller.extend("EHSMPortal.controller.Dashboard2", {
		onInit: function() {
			this.lotModel = new JSONModel();
			this.getView().setModel(this.lotModel, "lot");
			this.loadIncidentData();
		},

		onNavigateToView2: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("View2");
		},

		onLogout: function() {
			sap.m.MessageBox.confirm("Are you sure you want to logout?", {
				title: "Confirm Logout",
				icon: sap.m.MessageBox.Icon.QUESTION,
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				emphasizedAction: sap.m.MessageBox.Action.YES,
				onClose: function(oAction) {
					if (oAction === sap.m.MessageBox.Action.YES) {
						sap.ui.core.UIComponent.getRouterFor(this).navTo("View1");
					}
				}.bind(this)
			});
		},
		loadIncidentData: function () {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("ZEHSM_INC_MGMT_V1_CDS");
		
			oModel.metadataLoaded().then(function () {
				oModel.read("/ZEHSM_INC_MGMT_V1", {
					success: function (oData) {
						var results = oData.results || [];
						that._processData(results);
					},
					error: function () {
						sap.m.MessageToast.show("Failed to fetch EHSM incident data.");
					}
				});
			});
		},
		

		_processData: function(results) {
			var newCount = 0,
				reviewed = 0,
				voided = 0;

			for (var i = 0; i < results.length; i++) {
				var item = results[i];
				if (item.IncidentStatus === "NEW") newCount++;
				else if (item.IncidentStatus === "REVIEW COMPLETE" || item.IncidentStatus === "CLOSED") reviewed++;
				else if (item.IncidentStatus === "VOID") voided++;
				item.CreatedOn = new Date(item.CreatedOn);
			}

			var pageSize = 10;
			var currentPage = 1;
			var totalPages = Math.ceil(results.length / pageSize);

			this.lotModel.setData({
				total: results.length,
				new: newCount,
				reviewed: reviewed,
				voided: voided,
				results: results,
				currentPage: currentPage,
				pageSize: pageSize,
				totalPages: totalPages,
				pagedResults: results.slice(0, pageSize)
			});

			this._buildCharts(results);
		},

		_buildCharts: function(data) {
			this._buildDonut(this.byId("chart1"), data, "IncidentStatus", "Incident Status Distribution");
			this._buildBar(this.byId("chart2"), data, "IncidentGroup", "Incidents by Group");
			this._buildLine(this.byId("chart3"), data, "CreatedOn", "Monthly Incident Trend");
		},

		_buildDonut: function(oViz, data, groupField, title) {
			var map = {};
			data.forEach(function(d) {
				var key = d[groupField] || "Unknown";
				map[key] = (map[key] || 0) + 1;
			});

			var chartData = Object.keys(map).map(function(label) {
				return {
					label: label,
					value: map[label]
				};
			});

			oViz.setVizType("donut");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{
					name: "Status",
					value: "{label}"
				}],
				measures: [{
					name: "Count",
					value: "{value}"
				}],
				data: {
					path: "/"
				}
			}));
			oViz.setModel(new JSONModel(chartData));
			oViz.setVizProperties({
				title: {
					text: title,
					visible: true
				}
			});
			oViz.removeAllFeeds();
			oViz.addFeed(new FeedItem({
				uid: "size",
				type: "Measure",
				values: ["Count"]
			}));
			oViz.addFeed(new FeedItem({
				uid: "color",
				type: "Dimension",
				values: ["Status"]
			}));

			new Popover().connect(oViz.getVizUid());
			new VizTooltip().connect(oViz.getVizUid());
		},

		_buildBar: function(oViz, data, groupField, title) {
			var map = {};
			data.forEach(function(d) {
				var key = d[groupField] || "Unknown";
				map[key] = (map[key] || 0) + 1;
			});

			var chartData = Object.keys(map).map(function(key) {
				return {
					Category: key,
					Count: map[key]
				};
			});

			oViz.setVizType("column");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{
					name: "Category",
					value: "{Category}"
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
					text: title,
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
				values: ["Category"]
			}));

			new Popover().connect(oViz.getVizUid());
			new VizTooltip().connect(oViz.getVizUid());
		},

		_buildLine: function(oViz, data, dateField, title) {
			var map = {};
			data.forEach(function(d) {
				var date = new Date(d[dateField]);
				if (!isNaN(date)) {
					var key = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
					map[key] = (map[key] || 0) + 1;
				}
			});

			var chartData = Object.keys(map).sort().map(function(key) {
				return {
					Period: key,
					Count: map[key]
				};
			});

			oViz.setVizType("line");
			oViz.setDataset(new FlattenedDataset({
				dimensions: [{
					name: "Period",
					value: "{Period}"
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
					text: title,
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
				values: ["Period"]
			}));

			new Popover().connect(oViz.getVizUid());
			new VizTooltip().connect(oViz.getVizUid());
		},

		onNextPage: function() {
			var model = this.getView().getModel("lot");
			var page = model.getProperty("/currentPage");
			var total = model.getProperty("/totalPages");

			if (page < total) {
				model.setProperty("/currentPage", page + 1);
				this._updatePagedResults();
			}
		},

		onPrevPage: function() {
			var model = this.getView().getModel("lot");
			var page = model.getProperty("/currentPage");

			if (page > 1) {
				model.setProperty("/currentPage", page - 1);
				this._updatePagedResults();
			}
		},

		_updatePagedResults: function() {
			var model = this.getView().getModel("lot");
			var all = model.getProperty("/results");
			var page = model.getProperty("/currentPage");
			var size = model.getProperty("/pageSize");

			var start = (page - 1) * size;
			var end = start + size;
			model.setProperty("/pagedResults", all.slice(start, end));
		}
	});
});