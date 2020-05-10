define(['libs/tps/tps'], function(tps) {

    function calcTPS(controlPoints) {
      // calculate tps
      var P = [];
      var Q = [];

      for(var i = 0; i < controlPoints.length; i++) {
          var p = controlPoints[i];
          P.push([p.x1, p.y1]);
          Q.push([p.x2, p.y2]);
      }
      // returns a function interpolating (x, y) => [x', y']
      var project = tps(P, Q);
      return project;
    }

    /*
    function serializeTPS(controlPoints) {
        var tps = getTPS(controlPoints);
        return tps.serialize();
    }
    */

    function inversePoints(controlPoints) {
      var projPoints = [];
      for(var i = 0; i < controlPoints.length; i++) {
          var p = controlPoints[i];
          projPoints.push({x1: p.x2, y1: p.y2, x2: p.x1, y2: p.y1});
      }
      return projPoints;
    }

    function projectTargetPoints(controlPoints, projection) {
        var projPoints = [];
        for(var i = 0; i < controlPoints.length; i++) {
            var p = controlPoints[i];
            var proj = projection([p.x2, p.y2]);
            projPoints.push({x1: p.x1, y1: p.y1, x2: proj[0], y2: proj[1], enabled: p.enabled});
        }
        return projPoints;
    }

    function testTPS(controlPoints, sW, sH) {
        var tps = new ThinPlateSpline();
        var trans = [];

        for(var i = 0; i < controlPoints.length; i++) {
            var p = controlPoints[i];
            trans.push([[p.x1, p.y1], [p.x2, p.y2]]);
        }
        tps.push_points(trans);
        tps.solve();

        var points = [];
        var steps = 1;
        var stepX = sW / steps;
        var stepY = sH / steps;

        for(var i = 0; i < controlPoints.length; i++) {
            var crtl = controlPoints[i];
            var p = tps.transform([crtl.x1, crtl.y1], false);
            var invP = tps.transform(p, true);
            points.push([crtl.x2, p[0], crtl.y2, p[1]]);
            points.push([crtl.x1, invP[0], crtl.y1, invP[1]]);
        }
        console.log(JSON.stringify(controlPoints));
        console.log('ControlPoints', controlPoints);
        console.log('Points:', points);
    }

    function testTPS2(controlPoints, sW, sH) {
        var tps = new ThinPlateSpline();
        var trans = [];

        for(var i = 0; i < controlPoints.length; i++) {
            var p = controlPoints[i];
            trans.push([[p.x1, p.y1], [p.x2, p.y2]]);
        }
        tps.push_points(trans);
        tps.solve();

        var points = [];
        var steps = 1;
        var stepX = sW / steps;
        var stepY = sH / steps;

        for(var y = 0; y <= steps; y++) {
            for(var x = 0; x <= steps; x++) {
                var xT = x * stepX;
                var yT = y * stepY;
                var p = tps.transform([xT, yT], false);
                var invP = tps.transform(p, true);
                points.push([xT, invP[0], yT, invP[1]]);
            }
        }
        console.log(JSON.stringify(controlPoints));
        console.log('ControlPoints', controlPoints);
        console.log('Points:', points);
    }

    function findTransform(controlPoints, projection, sW, sH, tW, tH) {
        var pad = 0;

        var points = [];
        var steps = 1;
        var stepX = sW / steps;
        var stepY = sH / steps;

        var tps = calcTPS(projectTargetPoints(controlPoints, projection));

        for(var y = 0; y <= steps; y++) {
            for(var x = 0; x <= steps; x++) {
                var p = tps.transform([x * stepX, y * stepY], false);
                points.push(p);
            }
        }
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;

        for(var i in points) {
            var p = points[i];
            minX = Math.min(minX, p[0]);
            maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]);
            maxY = Math.max(maxY, p[1]);
        }
        var w = maxX - minX;
        var h = maxY - minY;
        var sw = (tW - pad * 2) / w;
        var sh = (tH - pad * 2) / h;
        var s = Math.min(sw, sh);

        var tx = -minX * s + pad;
        var ty = -minY * s + pad;
        projection.scale(s);
        projection.translate([tx, ty]);

    }
/*
    function findTransform2(positions, pad, tW, tH) {
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;

        for(var i=0; i < positions.length; i+=2) {
            minX = Math.min(minX, positions[i]);
            maxX = Math.max(maxX, positions[i]);
            minY = Math.min(minY, positions[i+1]);
            maxY = Math.max(maxY, positions[i+1]);
        }
        var w = maxX - minX;
        var h = maxY - minY;
        var sw = (tW - pad * 2) / w;
        var sh = (tH - pad * 2) / h;
        var s = Math.min(sw, sh);

        var tx = -minX * s + pad;
        var ty = -minY * s + pad;

        return { s, tx, ty };
    }
    */
    function findTransform2(positions, pad, tW, tH) {
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;

        for(var i=0; i < positions.length; i++) {
            minX = Math.min(minX, positions[i][0]);
            maxX = Math.max(maxX, positions[i][0]);
            minY = Math.min(minY, positions[i][1]);
            maxY = Math.max(maxY, positions[i][1]);
        }
        var w = maxX - minX;
        var h = maxY - minY;
        var sw = (tW - pad * 2) / w;
        var sh = (tH - pad * 2) / h;
        var s = Math.min(sw, sh);

        var tx = -minX * s + pad;
        var ty = -minY * s + pad;

        return { s, tx, ty };
    }

    // multiply nxn matrix with n component vector
    function matMul(mat, vec) {
        var res = [];
        for(var i = 0; i < mat.length; i++) {
            res[i] = 0;
            for(var j = 0; j < mat.length; j++) {
                res[i]+= mat[i][j] * vec[j];
            }
        }
        return res;
    }

    // multiply nxn matrix with nxn matrix
    function matMul2(mat1, mat2) {
        var res = [];
        for(var i = 0; i < mat1.length; i++) {
            res[i] = [];
            for(var j = 0; j < mat1.length; j++) {
                res[i][j] = 0;
                for(var k = 0; k < mat1.length; k++) {
                    res[i][j]+= mat1[i][k] * mat2[k][j];
                }
            }
        }
        return res;
    }

    return {
        matMul,
        matMul2,
        calcTPS,
        findTransform,
        findTransform2,
        projectTargetPoints,
        inversePoints,
        testTPS,
        testTPS2,
    }

});
