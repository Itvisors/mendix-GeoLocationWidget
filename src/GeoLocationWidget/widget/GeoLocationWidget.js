/*jshint undef: true, browser:true, nomen: true */
/*jslint browser:true, nomen: true */
/*global mx, define, require, console, google, logger */
/*
    GeoLocationWidget
    ========================

    @file      : GeoLocationWidget.js
    @version   : 1.2.2
    @author    : Marcel Groeneweg
    @date      : Sun, 11 Oct 2015 07:05:38 GMT
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
        apiAccessKey: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _result: null,
        _button: null,
        _mapContainer: null,
        _googleMap: null,
        _marker: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            //console.log(this.id + ".postCreate");

            // Placeholder container
            this._mapContainer = document.createElement("div");
            if (this.mapClass) {
                dojoClass.add(this._mapContainer, this.mapClass);
            } else {
                dojoStyle.set(this._mapContainer, {
                    height: "350px",
                    width: "100%"
                });
            }
            // Add to widget node
            this.domNode.appendChild(this._mapContainer);

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

            this.connect(this._button, "click", dojoLang.hitch(this, function (evt) {
                //console.log("GEO Location start getting location.");

                // Do geolocation
                navigator.geolocation.getCurrentPosition(
                    dojoLang.hitch(this, this._geolocationSucces),
                    dojoLang.hitch(this, this._geolocationFailure),
                    {timeout: 10000, enableHighAccuracy: true}
                );
            }));

        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            //console.log(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();

            if (this._contextObj) {
                if (typeof google === "undefined" || typeof google.maps === "undefined") {
                    this._loadGoogleApi(callback);
                } else {
                    this._showMap(callback);
                }
            }

        },

        _loadGoogleApi: function (callback) {

            var refNode,
                scriptElement,
                thisObj = this;

            // Find the first script node on the page.
            refNode = window.document.getElementsByTagName("script")[0];
            // Create a new script node and set the properties and callbacks
            scriptElement = document.createElement("script");
            scriptElement.async = true;
            scriptElement.defer = true;
            scriptElement.type = "text/javascript";
            scriptElement.id = "googleScript";
            scriptElement.src = "https://maps.googleapis.com/maps/api/js?key=" + this.apiAccessKey + "&libraries=places";
            scriptElement.onerror = function (err) {
                logger.error("GeoLocationWidget: loading Google API script failed. Check internet connection! ");
            };
            scriptElement.onload = function () {
                thisObj._showMap(callback);
            };
            // Add the node to the page to activate it.
            if (refNode && refNode.parentNode) {
                refNode.parentNode.insertBefore(scriptElement, refNode);
            }

        },

        _showMap: function (callback) {

            this._googleMap = new google.maps.Map(this._mapContainer, {
                zoom: this.defaultZoom,
                center: new google.maps.LatLng(this.defaultLat, this.defaultLng)
            });
            this._showMarker();

            callback();
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            if (this._googleMap) {
                google.maps.event.trigger(this._googleMap, "resize");
            }
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            this._marker.setMap(null);
            this._marker = null;

            window[this.id + "_mapsCallback"] = null;
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Rerender the interface.
        _updateRendering: function () {
            if (this._googleMap) {
                this._showMarker();
                google.maps.event.trigger(this._googleMap, "resize");
            }
        },

        _geolocationSucces: function (position) {
            this._setCurrentLocation(position.coords.latitude, position.coords.longitude);
        },

        _setCurrentLocation: function (latitude, longitude) {

            var geocoder,
                latlng;

            this._contextObj.set(this.latAttr, latitude.toFixed(8));
            this._contextObj.set(this.longAttr, longitude.toFixed(8));
            this._showMarker();
            if (this.reverseGeoCodingAction === "locationOnly") {
                this._executeMicroflow();
            } else {
                geocoder = new google.maps.Geocoder();
                latlng = {lat: latitude, lng: longitude};
                geocoder.geocode({
                    "location": latlng
                }, dojoLang.hitch(this, this._reverseGeoCodingSuccess));
            }
        },

        _showMarker: function () {
            var latLng;

            if (this._marker === null) {
                this._marker = new google.maps.Marker({
                    map: this._googleMap,
                    draggable: true
                });
                // Register Custom "dragend" Event
                google.maps.event.addListener(this._marker, "dragend", dojoLang.hitch(this, function () {
                    // Get the position where the pointer was dropped
                    var point = this._marker.getPosition();
                    // Move map to marker location
                    this._setCurrentLocation(point.lat(), point.lng());
                }));
            }
            latLng = this._createLatLng();
            this._marker.setPosition(latLng);
            this._googleMap.panTo(latLng);
            if (this.markerDisplayAttr && this._contextObj) {
                this._marker.setTitle(this._contextObj.get(this.markerDisplayAttr));
            }
        },

        _reverseGeoCodingSuccess: function (results, status) {
            var resultString;

            if (status === google.maps.GeocoderStatus.OK) {
                console.log("Reverse geocode OK");
                //console.dir(results);
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

        _createLatLng: function () {
            var lat,
                lng;

            if (this._contextObj) {
                lat = this._contextObj.get(this.latAttr).toFixed(8);
                lng = this._contextObj.get(this.longAttr).toFixed(8);
            }
            if (lat === null || lat === undefined) {
                lat = 0;
            }
            if (lng === null || lng === undefined) {
                lng = 0;
            }

            return new google.maps.LatLng(lat, lng);
        },

        _executeMicroflow: function () {

            if (this.onChangeMF && this._contextObj) {
                mx.data.action({
                    params      : {
                        actionname  : this.onChangeMF,
                        applyto     : "selection",
                        guids       : [this._contextObj.getGuid()]
                    }
                });
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

require(["GeoLocationWidget/widget/GeoLocationWidget"], function () {
    "use strict";
});
