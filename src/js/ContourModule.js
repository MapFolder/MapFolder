define(['d3', 'libs/martinez.min', 'libs/simplify'], function(d3, martinez, simplify) {

  function invertHoles(multiPolygon) {
    var out = [];
    for(var poly of multiPolygon) {
      for(var i = 1; i < poly.length; i++) {
        out.push([poly[i]]);
      }
    }
    return out;
  }

  function calcSegmentation(data, dimension) {
    var vMean = (data.vSumPos - data.vSumNeg) / ( dimension[0] * dimension[1] );
    var contours = d3.contours().size(dimension).thresholds([-vMean, 0, vMean]);
    console.time('contour');
    var geoJSON = contours(data.values);
    console.timeEnd('contour');
    /*
    var frameCoordinates = [
      [[[0, 0], [dimension[0], 0], [dimension[0], dimension[1]], [0, dimension[1]]]]
    ];
    */

    // returns hash of multipolygon coordinate arrays
    return {
      dimension,
      segments: {
        mag: geoJSON[2].coordinates,
        shrink: martinez.diff(geoJSON[1].coordinates, geoJSON[2].coordinates),
        negShrink: martinez.diff(geoJSON[0].coordinates, geoJSON[1].coordinates),
        negMag: invertHoles(geoJSON[0].coordinates),
      }
    }
  }

  function unkinkPolygon(polygon) {
    var geoPoly = turf.helpers.polygon(polygon);
    var collection = simplepolygon(geoPoly);
    var multi = [];
    for(var feature of collection.features) {
      //if(feature.properties.parent === -1) {
        multi.push(feature.geometry.coordinates);
      //}
    }
    /*
    for(var feature of collection.features) {
      if(feature.properties.netWinding === 0) {
        multi[feature.properties.parent].push(feature.geometry.coordinates[0]);
      }
    }
    var res = [];
    for(var i = 0; i < multi.length; i++) {
      var feature = collection.features[i];
      if(feature.properties.parent === -1) {
        res.push(multi[i]);
      }
    }

    console.log(collection, res);
    return res;
    */
    return multi;
  }

  function calcSegmentation2(data, dimension, project, eps) {
    var vMean = (data.vSumPos - data.vSumNeg) / ( dimension[0] * dimension[1] );
    var contours = d3.contours().size(dimension).thresholds([-vMean, 0, vMean]);
    console.time('contour');
    var geoJSON = contours(data.values);
    console.timeEnd('contour');

    var segments = {
      mag: geoJSON[2].coordinates,
      shrink: martinez.diff(geoJSON[1].coordinates, geoJSON[2].coordinates),
      negShrink: martinez.diff(geoJSON[0].coordinates, geoJSON[1].coordinates),
      negMag: invertHoles(geoJSON[0].coordinates),
    }

    var features = [];

    console.time('simplify');
    for(var type in segments) {
      var segment = segments[type];
      for(var polygon of segment) {
        var projPolygon = projectPolygon(polygon, project);
        simplifyInPlace(polygon, eps);
        simplifyInPlace(projPolygon, eps * 0.05);
        //console.log('unkink poly');
        //var polygon = unkinkPolygon(polygon);
        //console.log('unkink proj');
        //var projMulti = unkinkPolygon(projPolygon);
        features.push({polygon, projPolygon, /*projMulti,*/ type, annotations: []});
      }
    }
    console.timeEnd('simplify');

    // returns hash of multipolygon coordinate arrays
    return features;
  }

  function simplifyInPlace(polygon, eps) {
    for(var i = 0; i < polygon.length; i++) {
      var ring = polygon[i];
      var simplified = simplify(ring, eps);
      var o = orientation(ring);
      //fix orientation: exterior ring -> ccw, holes -> cw
      if((i === 0 && o > 0) || (i > 0 && o < 0)) {
        simplified.reverse();
      }
      polygon[i] = simplified;
    }
  }

  function orientation(ring) {
    var sum = 0;

    //filter duplicates
    var filtered = ring.filter((p, i) => {
      var p1 = ring[i];
      var p2 = ring[(i + 1) % ring.length];
      return (p1[0] !== p2[0] || p1[1] !== p2[1]);
    });

    for(var i = 0; i < filtered.length; i++) {
      var p1Idx = (i) % filtered.length;
      var p2Idx = (i + 1) % filtered.length;
      var p1 = ring[p1Idx];
      var p2 = ring[p2Idx];
      sum+=(p2[0] - p1[0]) * (p2[1] + p1[1]);
    }
    return sum;
  }

  function projectPolygon(polygon, project) {
    return polygon.map(ring => ring.map(p => project(p)));
  }



  return {
    calcSegmentation,
    calcSegmentation2
  }

});
