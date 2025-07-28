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

			if (!oMsgStrip) {
				jQuery.sap.log.warning("msgStrip not found in the view.");
				return;
			}
			oMsgStrip.setVisible(false);

			var sUser = oUserInput ? oUserInput.getValue().trim() : "";
			var sPass = oPassInput ? oPassInput.getValue().trim() : "";

			if (!sUser || !sPass) {
				oMsgStrip.setText("Please enter both username and password.");
				oMsgStrip.setType("Warning");
				oMsgStrip.setVisible(true);
				return;
			}

			// Use named model declared in manifest.json
			var oModel = this.getOwnerComponent().getModel("ZPP_QLOGIN_V_CDS");
			var sPath = "/ZPP_QLOGIN_V(p_bname='" + sUser + "',p_pass='" + encodeURIComponent(sPass) + "')/Set";
			var that = this;

			oModel.metadataLoaded().then(function() {
				oModel.read(sPath, {
					success: function(oData) {
						var result = oData.results && oData.results[0];
						if (result && result.login_status === "Y") {
							oMsgStrip.setText("Login successful!");
							oMsgStrip.setType("Success");
							oMsgStrip.setVisible(true);
							sap.ui.core.UIComponent.getRouterFor(that).navTo("View2");
						} else {
							oMsgStrip.setText("Invalid username or password.");
							oMsgStrip.setType("Error");
							oMsgStrip.setVisible(true);
						}
					},
					error: function() {
						oMsgStrip.setText("Server error during login. Please try again.");
						oMsgStrip.setType("Error");
						oMsgStrip.setVisible(true);
					}
				});
			});
		}
	});
});
