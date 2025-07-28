sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/viz/ui5/controls/Popover",
	"sap/viz/ui5/controls/VizTooltip",
	"sap/m/MessageToast"
], function(
	Controller,
	JSONModel,
	FlattenedDataset,
	FeedItem,
	Popover,
	VizTooltip,
	MessageToast
) {
	"use strict";

	return Controller.extend("EHSMPortal.controller.Dashboard1", {

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

		onInit: function() {
			this._loadData();
		},

		_loadData: function () {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("ZEHSM_RISK_ASMT_V1_CDS");
		
			oModel.metadataLoaded().then(function () {
				oModel.read("/ZEHSM_RISK_ASMT_V1", {
					success: function (oData) {
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
		
						var pageSize = 17;
						var currentPage = 1;
						var totalPages = Math.ceil(results.length / pageSize);
		
						var kpi = {
							total: results.length,
							members: Object.keys(uniqueMembersMap).length,
							roles: Object.keys(uniqueRolesMap).length,
							results: results,
							pageSize: pageSize,
							currentPage: currentPage,
							totalPages: totalPages,
							pagedResults: results.slice(0, pageSize)
						};
		
						var oJsonModel = new sap.ui.model.json.JSONModel(kpi);
						that.getView().setModel(oJsonModel, "risk");
		
						that._updateBarChart(results);
						that._updateLineChart(results);
					},
					error: function () {
						sap.m.MessageToast.show("Failed to load risk assessment data.");
					}
				});
			});
		},
		

		_updatePagedResults: function() {
			var oModel = this.getView().getModel("risk");
			var all = oModel.getProperty("/results");
			var page = oModel.getProperty("/currentPage");
			var size = oModel.getProperty("/pageSize");

			var start = (page - 1) * size;
			var end = start + size;
			oModel.setProperty("/pagedResults", all.slice(start, end));
		},

		onNextPage: function() {
			var oModel = this.getView().getModel("risk");
			var page = oModel.getProperty("/currentPage");
			var total = oModel.getProperty("/totalPages");

			if (page < total) {
				oModel.setProperty("/currentPage", page + 1);
				this._updatePagedResults();
			}
		},

		onPrevPage: function() {
			var oModel = this.getView().getModel("risk");
			var page = oModel.getProperty("/currentPage");

			if (page > 1) {
				oModel.setProperty("/currentPage", page - 1);
				this._updatePagedResults();
			}
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
				},
				plotArea: {
					dataLabel: {
						visible: true
					}
				},
				legend: {
					isScrollable: true,
					layout: {
						position: "bottom"
					}
				},
				interaction: {
					selectability: {
						mode: "multiple"
					}
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

			var oPopOver = new Popover();
			oPopOver.connect(oViz.getVizUid());

			var oTooltip = new VizTooltip();
			oTooltip.connect(oViz.getVizUid());
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
			oViz.setVizType("line");

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