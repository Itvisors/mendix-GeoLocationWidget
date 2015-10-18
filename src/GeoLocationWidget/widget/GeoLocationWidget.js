/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, define, require, console, google */
/*
    GeoLocationWidget
    ========================

    @file      : GeoLocationWidget.js
    @version   : 1.0
    @author    : Marcel Groeneweg
    @date      : Sun, 11 Oct 2015 07:05:38 GMT
    @copyright : 
    @license   : Apache 2

    Documentation
    ========================
    Use Google client library to get current location. The Google client library takes WiFi access points into account to determine the location.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/request/script"
], function (declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoScript) {
    "use strict";

    // Declare widget's prototype.
    return declare("GeoLocationWidget.widget.GeoLocationWidget", [ _WidgetBase ], {

        // DOM elements

        // Parameters configured in the Modeler.
        buttonLabel: "",
        buttonClass: "",
        latAttr: "",
        longAttr: "",
        onChangeMF: "",
        doReverseGeocoding: true,
        reverseGeocodingResultJson: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _result : null,
        _button : null,
        _hasStarted : false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            //console.log(this.id + ".postCreate");
            
            // Placeholder container
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

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            //console.log(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {},

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
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
                    dojoLang.hitch(this, this._geolocationSuccess),
                    dojoLang.hitch(this, this._geolocationFailure),
                    {timeout: 10000, enableHighAccuracy: true}
                );
            }));
        },

        // Rerender the interface.
        _updateRendering: function () {
        },


        _geolocationSuccess: function (position) {

            var geocoder,
                latlng;
            
            this._contextObj.set(this.latAttr, position.coords.latitude.toFixed(8));
            this._contextObj.set(this.longAttr, position.coords.longitude.toFixed(8));
            if (this.reverseGeoCodingAction === "locationOnly") {
                this._executeMicroflow();
            } else {
                geocoder = new google.maps.Geocoder();
                latlng = {lat: position.coords.latitude, lng: position.coords.longitude};
                geocoder.geocode({
                    "location": latlng
                }, dojoLang.hitch(this, this._reverseGeoCodingSuccess));
            }
        },
        
        _reverseGeoCodingSuccess: function (results, status) {
            var resultString;
            
            if (status === google.maps.GeocoderStatus.OK) {
                console.log("Reverse geocode OK");
                console.dir(results);
                if (this.reverseGeoCodingAction === "fullResult") {
                    resultString = JSON.stringify(results);
                    this._contextObj.set(this.reverseGeocodingResultJson, resultString);
                } else {
                    if (results && results.length && results[0]) {
                        this._contextObj.set(this.address, results[0].formatted_address);
                    }
                }
                this._executeMicroflow();
            } else {
                window.alert("Geocoder failed due to: " + status);
            }
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

        _executeMicroflow: function () {

            if (this.onChangeMF && this._contextObj) {
                mx.processor.xasAction({
                    error       : function () {},
                    actionname  : this.onChangeMF,
                    applyto     : "selection",
                    guids       : [this._contextObj.getGuid()]
                });
            }
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            // Release handles on previous object, if any.
            if (this._handles) {
                this._handles.forEach(function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
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

require(["GeoLocationWidget/widget/GeoLocationWidget"], function () {
    "use strict";
});
