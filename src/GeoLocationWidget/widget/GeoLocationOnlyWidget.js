/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, define, require, console, logger */
/*
    GeoLocationWidget
    ========================

    @file      : GeoLocationOnlyWidget.js
    @version   : 1.2.2
    @author    : Marcel Groeneweg
    @date      : Fri, 2 Feb 2018
    @copyright :
    @license   : Apache 2

    Documentation
    ========================
    Use Google client library to get current location. The Google client library takes WiFi access points into account to determine the location.
    This widget depends on the original GoogleMaps widget for the AMD loader.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/_base/event"
], function (declare, _WidgetBase, dojoClass, dojoStyle, dojoLang, dojoHtml, dojoEvent) {
    "use strict";

    // Declare widget's prototype.
    return declare("GeoLocationWidget.widget.GeoLocationOnlyWidget", [ _WidgetBase ], {

        // DOM elements

        // Parameters configured in the Modeler.
        buttonLabel: "",
        buttonClass: "",
        latAttr: "",
        longAttr: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _result: null,
        _button: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            //console.log(this.id + ".postCreate");
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            //console.log(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();

            this.setupWidget(callback);

        },

        setupWidget: function (callback) {

            // Button
            this._button = document.createElement("div");
            dojoClass.add(this._button, "btn");
            if (this.buttonClass) {
                dojoClass.add(this._button, this.buttonClass);
            } else {
                dojoClass.add(this._button, "btn-primary");
            }

            dojoHtml.set(this._button, this.buttonLabel || "GEO Location");

            // Add to widget node
            this.domNode.appendChild(this._button);

            this._setupEvents();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            this.connect(this._button, "click", dojoLang.hitch(this, function (evt) {
                //console.log("GEO Location start getting location.");

                // The camera function has a success, failure and a reference to this.
                navigator.geolocation.getCurrentPosition(
                    dojoLang.hitch(this, this._geolocationSucces),
                    dojoLang.hitch(this, this._geolocationFailure),
                    {timeout: 10000, enableHighAccuracy: true}
                );
            }));
        },

        // Rerender the interface.
        _updateRendering: function () {
        },

        _geolocationSucces: function (position) {
            this._setCurrentLocation(position.coords.latitude, position.coords.longitude);
        },

        _setCurrentLocation: function (latitude, longitude) {

            this._contextObj.set(this.latAttr, latitude.toFixed(8));
            this._contextObj.set(this.longAttr, longitude.toFixed(8));
        },

        _geolocationFailure: function (error) {

            //console.log("GEO Location failure!");
            //console.log(error.message);

            if (this._result) {
                dojoHtml.set(this._result, "GEO Location failure...");
            } else {
                this._result = document.createElement("div");
                dojoHtml.set(this._result, "GEO Location failure...");
                this.domNode.appendChild(this._result);
            }
        },


        // Reset subscriptions.
        _resetSubscriptions: function () {
            var thisObj = this;
            // Release handles on previous object, if any.
            if (this._handles) {
                this._handles.forEach(function (handle) {
                    thisObj.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscriptions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });


                this._handles = [ objectHandle ];
            }
        }
    });
});

require(["GeoLocationWidget/widget/GeoLocationOnlyWidget"], function () {
    "use strict";
});
