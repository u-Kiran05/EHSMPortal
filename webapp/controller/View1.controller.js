sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageStrip"
], function(Controller, MessageToast, MessageStrip) {
	"use strict";

	return Controller.extend("EHSMPortal.controller.View1", {
		onLoginPress: function() {
			var oView = this.getView();
			var oUserInput = oView.byId("username");
			var oPassInput = oView.byId("password");
			var oMsgStrip = oView.byId("msgStrip");

			// Check if msgStrip exists
			if (!oMsgStrip) {
				jQuery.sap.log.warning("msgStrip not found in the view.");
				return;
			}

			oMsgStrip.setVisible(false); // Hide previous messages

			// Check if inputs exist before calling getValue
			var sUser = oUserInput ? oUserInput.getValue().trim() : "";
			var sPass = oPassInput ? oPassInput.getValue().trim() : "";

			if (!sUser || !sPass) {
				oMsgStrip.setText("Please enter both username and password.");
				oMsgStrip.setType("Warning");
				oMsgStrip.setVisible(true);
				return;
			}

			// Call OData service
			var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZPP_QLOGIN_V_CDS/");
			var sPath = "/ZPP_QLOGIN_V(p_bname='" + sUser + "',p_pass='" + encodeURIComponent(sPass) + "')/Set";

			var that = this;

			oModel.read(sPath, {
				success: function(oData) {
					var result = oData.results && oData.results[0];
					if (result && result.login_status === "Y") {
						oMsgStrip.setVisible(true);
						oMsgStrip.setText("Login successful!");
						oMsgStrip.setType("Success");

						var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
						oRouter.navTo("View2");
					} else {
						oMsgStrip.setVisible(true);
						oMsgStrip.setText("Invalid username or password.");
						oMsgStrip.setType("Error");
					}
				},
				error: function() {
					oMsgStrip.setVisible(true);
					oMsgStrip.setText("Server error during login. Please try again.");
					oMsgStrip.setType("Error");
					oStatusText.setText("Login failed.");
				}
			});

		}
	});
});