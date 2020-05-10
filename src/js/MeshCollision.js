define(['libs/rbush/rbush'], function(rbush) {

    function calcBBox(points) {
      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;
      for(var i in points) {
        minX = Math.min(points[i][0], minX);
        minY = Math.min(points[i][1], minY);
        maxX = Math.max(points[i][0], maxX);
        maxY = Math.max(points[i][1], maxY);
      }
      return [minX, minY, maxX, maxY];
    }

    function getBaryCoords(p1, p2, p3, x, y) {
      var div = (p2[1] - p3[1])*(p1[0]-p3[0]) + (p3[0] - p2[0]) * (p1[1] - p3[1]);
      var d1 = ((p2[1] - p3[1])*(x - p3[0]) + (p3[0] - p2[0])*(y - p3[1])) / div;
      var d2 = ((p3[1] - p1[1])*(x - p3[0]) + (p1[0] - p3[0])*(y - p3[1])) / div;
      var d3 = 1 - d1 - d2;
      return [d1, d2, d3];
    }

    function isBaryValid(bary) {
      return (bary[0] >= 0 && bary[0] <=1 && bary[1] >= 0 && bary[1] <=1 && bary[2] >= 0 && bary[2] <=1);
    }

    function getPixel(bary, a, b, c ) {
      var x = (bary[0] * a[0]) + (bary[1] * b[0]) + (bary[2] * c[0]);
      var y = (bary[0] * a[1]) + (bary[1] * b[1]) + (bary[2] * c[1]);
      return [x, y];
    }

    function generateProjectedQuadMesh(tps, numSteps, w, h) {
        var tpsPositions = [];
        for(var y = 0; y < numSteps; y++) {
            for(var x = 0; x < numSteps; x++) {
              var t = tps(x / (numSteps - 1) * w, y / (numSteps - 1) * h); // forward transformation
              tpsPositions.push(t);
            }
        }
        return tpsPositions;
    }

    function triangulateGeoJSONEarcut(polygons, prop, earcut) {
      var tris = [];
      for(var i = 0; i < polygons.length; i++) {
        var poly = polygons[i][prop];
        if(poly.length > 0) {
          var flattened = earcut.flatten(poly);
          var triangles = earcut(flattened.vertices, flattened.holes, flattened.dimensions);
          tris.push({vertices: new Float32Array(flattened.vertices), indices: new Uint16Array(triangles), dimensions: flattened.dimensions});
        }
      }
      return tris;
    }

    function triangulateGeoJSONLibtess(polygons, prop, triangulate) {
      var tris = [];
      for(var i = 0; i < polygons.length; i++) {
        var poly = polygons[i][prop];
        if(poly.length > 0) {
          var vertices = triangulate(poly);
          var indices = new Uint16Array(vertices.length / 2);
          indices.forEach((v, i, a) => { a[i] = i });
          tris.push({vertices: new Float32Array(vertices), indices, dimensions: 2});
        }
      }
      return tris;
    }

    function triangulateGeoJSONMultiPolyLibtess(features, prop, triangulate) {
      var tris = [];
      for(var i = 0; i < features.length; i++) {
        var multi = features[i][prop];
        var vertices = [];
        for(var j = 0; j < multi.length; j++) {
          var poly = multi[j];
          if(poly.length > 0) {
            var pVertices = triangulate(poly);
            pVertices.forEach(v => { vertices.push(v)});
          }
        }
        var indices = new Uint16Array(vertices.length / 2);
        indices.forEach((v, i, a) => { a[i] = i });
        tris.push({vertices: new Float32Array(vertices), indices, dimensions: 2});
      }
      return tris;
    }


    function triMeshToRTree(polygons) {
      var rtree = new rbush(9, ['[0]', '[1]', '[2]', '[3]']);
      var rects = [];

      for(var i = 0; i < polygons.length; i++) {
        var {vertices, indices} = polygons[i];
        var j = 0;
        while(j < indices.length) {
          var t1 = indices[j++] * 2;
          var t2 = indices[j++] * 2;
          var t3 = indices[j++] * 2;
          var p1 = [vertices[t1], vertices[t1 + 1]];
          var p2 = [vertices[t2], vertices[t2 + 1]];
          var p3 = [vertices[t3], vertices[t3 + 1]];
          var tri = [p1, p2, p3];
          var bBox = calcBBox(tri);
          bBox[4] = tri;
          bBox[5] = i; //index to identify the polygon
          rects.push(bBox);
        }
      }
      rtree.load(rects);
      return rtree;
    }

    function quadMeshToRTree(mesh, numSteps, w, h) {
      var rtree = new rbush(9, ['[0]', '[1]', '[2]', '[3]']);
      var rects = [];
      for(var y = 0; y < (numSteps - 1); y++) {
          for(var x = 0; x < (numSteps - 1); x++) {
            var p1 = mesh[x + y * numSteps];
            var p2 = mesh[x +  1 + y * numSteps];
            var p3 = mesh[x  + (y + 1) * numSteps];
            var p4 = mesh[x + 1 + (y + 1) * numSteps];
            var bBox = calcBBox([p1, p2, p3, p4]);
            bBox[4] = [p1, p2, p3, p4];
            bBox[5] = [
              [x / (numSteps - 1) * w,y / (numSteps - 1) * h],
              [(x+1) / (numSteps - 1) * w,y / (numSteps - 1) * h],
              [(x) / (numSteps - 1) * w,(y+1) / (numSteps - 1) * h],
              [(x+1) / (numSteps - 1) * w,(y+1) / (numSteps - 1) * h]
            ];
            rects.push(bBox);
          }
      }
      rtree.load(rects);
      return rtree;
    }

    function pointTestQuadMeshInverse(point, rtree) {
      var boxes = rtree.search({minX: point[0], minY: point[1], maxX: point[0], maxY: point[1]});
      var pixels = [];
      for(var i in boxes) {
        var box = boxes[i][4];
        var uvs = boxes[i][5];
        var bary1 = getBaryCoords(box[0], box[1], box[2], point[0], point[1]);
        var bary2 = getBaryCoords(box[1], box[3], box[2], point[0], point[1]);
        if(isBaryValid(bary1)) {
          pixels.push(getPixel(bary1, uvs[0], uvs[1], uvs[2]));
        }
        if(isBaryValid(bary2)) {
          pixels.push(getPixel(bary2, uvs[1], uvs[3], uvs[2]));
        }
      }
      return pixels;
    }

    function pointTestTriMesh(point, rtree) {
      var boxes = rtree.search({minX: point[0], minY: point[1], maxX: point[0], maxY: point[1]});
      var tris = [];
      for(var i in boxes) {
        var box = boxes[i];
        var tri = box[4];
        var idx = box[5];
        var bary = getBaryCoords(tri[0], tri[1], tri[2], point[0], point[1]);
        if(isBaryValid(bary)) {
          tris.push(idx);
        }
      }
      return tris;
    }

    return {
        triangulateGeoJSONEarcut,
        triangulateGeoJSONLibtess,
        triangulateGeoJSONMultiPolyLibtess,
        generateProjectedQuadMesh,
        triMeshToRTree,
        quadMeshToRTree,
        pointTestQuadMeshInverse,
        pointTestTriMesh,
    }

});
