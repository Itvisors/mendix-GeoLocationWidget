# Geo location widget

Determine current location of the device. Find closest address to the location using reverse geocoding.

## Typical usage scenario

Determine current location of the device. This widget uses the Google client library to get the current location, which takes WiFi access points into account to determine the location.

The widget also shows the location on a map and allows the user to drag the marker.

Optionally, the location can be reverse geocoded into an address.


## Features And Limitations

- Determine actual device location
- Show location on the map
- User can drag the marker.
- Marker location can be reverse geocoded into an address.
- Full reverse geocoding result can be saved for processing in a microflow
- Call a microflow when location was determined or changed.
- Google JavaScript API is used, no dependency on PhoneGap/Cordova
- Works with Decimal attributes only

## Installation

Normal installation using the App Store

## Dependencies

- Mendix 7 and up

## Properties

### Button
A fixed, translatable, label can be set for the button

### Styling

#### Button class
Optional, specify a class to be used on the button. If not specified, btn-primary is used.

#### Map class
This class is set on the map container. Define this class in your CSS to set the dimensions of the map. If not specified, the map is set to 100% width and 350px height.

#### Location
The latitude/longitude attributes must be Decimals. Specify the microflow to be called when the location changes.

#### Reverse geocoding
Specify whether to perform reverse geocoding and the way to handle the result. In most situations, using the formatted address of the first result will be sufficient. If required, the full result JSON data can be saved on the object for processing in your own logic.

#### Map
Specify the Google API key to use. As of Google API v1.3 this is required. You can get one here:
[Google maps](https://cloud.google.com/maps-platform/)

The widget uses [Google Maps API v3](https://developers.google.com/maps/). So the [Limitations](https://developers.google.com/maps/premium/usage-limits)
from Google apply.


