# MapFolder

This tool has its beginning in a project for a [ DH abstract](https://dev.clariah.nl/files/dh2019/boa/0932.html).
It's purpose is to visualize, how space is represented in historic maps compared to the modern web mercator projection.
For details of the visualization, have a look at the abstract.

# License

The license for the source code of the project can be found in the `LICENSE` file.
The GeoJSON files exported using your own imported data is under whatever license you find appropriate, as long as it does not conflict with the license of the data imported to the tool.

You may distribute screenshots or any visual output of the tool, in original or modified form. However, you must attribute the MapFolder team appropriately.
Especially, when using the visual output by this software for presentations, on websites or print products, the following reference MUST be clearly visible:

M. Reckziegel, D. J. Wrisley, T. W. Hixson, S. Jänicke<br/>
**Using Visualization to Understand the Complex Spatiality of Mappae Mundi**<br/>
Proceedings of the Digital Humanities 2019<br/>
https://github.com/MapFolder/MapFolder


# Data Format

MapFolder can import data in two formats.

## CSV/Image Pair

The csv file of this pair needs the following columns:

```
x, y, lon, lat
```

The first two are the image pixel coordinates, the second two the corresponding geographic location in WGS84 coordinate system. Each row represents one control point.
The image pixel coordinates increase from left to right, respectively top to bottom.

The image file may be of any format a web browser is capable to understand.

## GeoJSON

We developed an extended [GeoJSON](geojson.org) format to import and export data according our specific needs.

Each feature, which is either a control point or a region calculated by MapFolder will be a "Feature" in a GeoJSON "FeatureCollection".

### Control Points

The geographic location will be stored as a GeoJSON "Point" geometry "Feature".
The location in image coordinates will be stored in the "properties" object of the GeoJSON "Feature" as `imageX` and `imageY` attributes. Further, `lon` and `lat` attributes are added, pointing to the geographic location for convenience.
Any additional attribute of the "properties" object will be treated as key-value pair annotation in MapFolder.

### Regions

MapFolder segments the historic map image into regions of different types.
Respectively the mean scaling factor of the computed Thin Plate Spline function, these are `mag` for magnified regions, `shrunk` for diminished regions, `negMag` for flipped magnified regions and `negShrunk` for flipped shrunk regions.
MapFolder calculates the polygons of those regions in the historic image coordinates as well as their projected counterparts in WGS84 coordinate system.
The projected polygons consist of the projected coordinates in the same order as unprojected, as such they may heavily self intersect.

For each region, a GeoJSON "Polygon" geometry feature is stored, containing the projected polygon.
The polygon in image coordinates will be stored in the "properties" object of the GeoJSON "Feature" as `imagePolygon` array attribute. The array consists of one exterior ring followed optionally by interior rings defining holes, just like any regular GeoJSON polygon, but with image, rather WGS84 coordinates. Further, the `type` attribute specifies the type of the region as mentioned above.
Any additional attribute of the "properties" object will be treated as key-value pair annotation in MapFolder.

### Example

An example of the GeoJSON format can be found inside `data/al_idrisi.geojson`.
The basic structure resembles like this:
```
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [lon, lat]
    },
    "properties": {
      "imageX": x,
      "imageY": y,
      "lon": lon,
      "lat": lat,
      "annotation_key1": "annotation_value1",
      "annotation_key2": "annotation_value2",
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [outer_ring, inner_ring1, ...],
    },
    "properties": {
      "type": "mag",
      "imagePolygon": [outer_ring, inner_ring1, ...],
      "annotation_key1": "annotation_value1",
      "annotation_key2": "annotation_value2",
    }
  },
  ...]
}
```
