define(['libs/tps/tps'], function(tps) {

    function calcProject(controlPoints) {
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

    function TPSVisualizerOff(controlPoints, stencilControlPoints, sX, sY, w, h, type) {

        var project = calcProject(controlPoints);
        var stencilProject = calcProject(stencilControlPoints);

        function calcArea(x,y) {
            var area = 0;
            var j = x.length - 1;
            for(var i = 0; i < x.length; i++) {
                area = area + (x[j] + x[i]) * (y[j] - y[i]);
                j = i;
            }
            return area / 2;
        }


        var values = new Float32Array(w * h);

        var eX = sX + w;
        var eY = sY + h;

        var delta = 2; // to work with the tps cache this should be integers

        function calcValue(a, b, c, d, type) {
            // type 0: divergence (a - 1 + d - 1) major diagonal
            // type 1: area of parallelogram defined by (b,d) and (a,c)
            // type 2: x divergence (a - 1)
            // type 3: x scaling a
            // type 4: y divergence (d - 1)
            // type 5: y scalinng d
            // type 6: curl (c - b) minor diagonal
            // type 7: areal scale defined by gaussian fundamental quantities
            switch(type) {
                case 0:
                    return a + d - 2;
                case 1:
                    //var x = [0, b, a + b, a];
                    //var y = [0, d, c + d, c];
                    //return calcArea(x,y);
                    // simplified equivalent:
                    // simplified areal calc :-)
                    return a * d - b * c;
                case 2:
                    return a - 1;
                case 3:
                    return a;
                case 4:
                    return d - 1;
                case 5:
                    return d;
                case 6:
                    return c - b;
                case 7:
                    // sqrt(E*G - F*F)
                    //var e = a * a + b * b;
                    //var g = c * c + d * d;
                    //var f = (a * c) + (b * d);
                    var e = a * a + c * c;
                    var g = b * b + d * d;
                    var f = (a * b) + (c * d);
                    return Math.sqrt(e * g - f * f);
                default:
                    throw new Error('invalid type');
            }
        }

        function pass1() {
            var i = 0;
            var vMax = -Infinity;
            var vMin = Infinity;
            var vSumPos = 0;
            var vSumNeg = 0;
            var cacheW = (w + delta);
            var cacheH = (h + delta);
            var tpsCacheX = new Float64Array(cacheW * cacheH);
            var tpsCacheY = new Float64Array(cacheW * cacheH);
            for(var x = 0; x < cacheW; x++) {
              for(var y = 0; y < cacheH; y++) {
                var p = project(x + sX, y + sY);
                tpsCacheX[x + y * cacheW] = p[0];
                tpsCacheY[x + y * cacheW] = p[1];
              }
            }

            function projectCache(x, y) {
              var off = (x - sX) + (y - sY) * cacheW;
              return [tpsCacheX[off], tpsCacheY[off]];
            }

            for(var y = sY; y < eY; y++) {
                for(var x = sX; x < eX; x++) {
                    var center = projectCache(x, y);
                    var right = projectCache(x + delta, y);
                    var top = projectCache(x, y + delta);
                    //var left = projectCache(x - delta, y);
                    //var bottom = projectCache(x, y - delta);

                    var c1x = (right[0] - center[0]) / (delta);//a
                    var c1y = (right[1] - center[1]) / (delta);//c
                    var c2x = (top[0] - center[0]) / (delta);//b
                    var c2y = (top[1] - center[1]) / (delta);//d
                    var value = calcValue(c1x, c2x, c1y, c2y, Number(type));

                    values[i++] = value;

                    vMax = Math.max(vMax, value);
                    vMin = Math.min(vMin, value);
                    if(value > 0) {
                      vSumPos+= value;
                    } else {
                      vSumNeg+= value;
                    }

                }
            }

            return { vMin, vMax, vSumPos, vSumNeg, values };
        }

        function discretize(v, slice, dir) {
            return dir ? Math.ceil(v / slice) * slice : Math.floor(v / slice) * slice;
        }

        function blend(r1,g1,b1,a1,r2,g2,b2,a2) {
          var a_ = (a1 + a2 * (1 - a1));
          var r = (r1 * a1 + r2 * a2 * (1 - a1)) / a_;
          var g = (g1 * a1 + g2 * a2 * (1 - a1)) / a_;
          var b = (b1 * a1 + b2 * a2 * (1 - a1)) / a_;
          return {r, g, b, a_};
        }

        function gradient(x, y, vMin, vMax) {
          var range = vMax - vMin;
          var xd = x < (w-1) ? 1 : -1;
          var yd = y < (h-1) ? 1 : -1;
          var f1 = (values[y * w + x] - vMin) / range;
          var f2 = (values[y * w + x + xd] - vMin) / range;
          var f3 = (values[(y + yd) * w + x] - vMin) / range;
          var dx = f2 - f1;
          var dy = f3 - f1;
          return Math.sqrt(dx * dx + dy * dy);
        }

        function blendScalar(a,b,v) {
          return (1-v) * a + v * b;
        }


        function pass2(vMin, vMax, vSumPos, vSumNeg, cw, ch, bitMask, visType, meanThickness, foldThickness, renderOverlap, stencilMap) {
            var t1 = performance.now();
            var i = 0;

            var vMean = (vSumPos - vSumNeg) / ( cw * ch );
            var length = w * h;
            var imgArrayBuffer = new ArrayBuffer(length * 4)
            var imgArray = new Uint8ClampedArray(imgArrayBuffer);
            var absMax1 = Math.max(Math.abs(vMax - vMean), Math.abs(vMean - vMin));
            var absMax = Math.max(Math.abs(vMax), Math.abs(vMin));
            var i = 0;
            var baseAlpha;

            var sList = [-1, 0, 1];

            for(var y = sY; y < eY; y++) {
                for(var x = sX; x < eX; x++) {
                  var alpha = 255;
                  var r = 0;
                  var g = 0;
                  var b = 0;
                  var val = values[i];
                  var v = (Math.abs(val) - vMean) / absMax1;
                  if(v < 0) {
                    v = -(Math.log2(-v + 1));
                  } else {
                    v = Math.log2(v + 1);
                  }

                  if(visType === 0) {
                    imgArray[i * 4] = 0;
                    imgArray[i * 4 + 1] = 0;
                    imgArray[i * 4 + 2] = 0;
                    imgArray[i * 4 + 3] = 0;
                    i++;
                    continue;
                  } else if(visType === 1) {
                    baseAlpha = 0;
                  } else if(visType === 2) {
                    baseAlpha = 100;
                  } else {
                    baseAlpha = 255;
                  }

                  var minAlpha = (v < 0 && !(bitMask & 1)) || (v > 0 && !(bitMask & 2)) || (val < 0 && !(bitMask & 4)) || (val > 0 && !(bitMask & 8)) ? 0 : baseAlpha;

                  if((v < 0 && !(bitMask & 1)) || (v > 0 && !(bitMask & 2)) || (val < 0 && !(bitMask & 4)) || (val > 0 && !(bitMask & 8))) {
                  //disable:  shrink                         mag                        fold                          unfold
                      alpha = 0;
                  } else {
                      var d1 = Math.abs(discretize(v, 0.1, false) - v);
                      var d2 = Math.abs(discretize(v, 0.1, true) - v);
                      alpha = Math.max(minAlpha, Math.min(150, Math.abs(v) * 3 * 150) - Math.min(d1, d2) * 10 * 255);
                  }
                  var vTrans = Math.pow(Math.abs(v), 1 / 3);
                  if( v < 0 ) {
                      if(val >= 0 || type !== 1) {
                          b = vTrans * 255; // blue channel
                      } else {
                          // negative scaling
                          b = vTrans * 255; // blue channel
                          g = vTrans * 255; // green channel
                      }
                  } else {
                      if(val >= 0 || type !== 1) {
                          r = vTrans * 255; // blue channel
                      } else {
                          // negative scaling
                          r = vTrans * 255 * 1; // blue channel
                          g = vTrans * 165 * 1; // green channel
                      }
                      //r = v * 255; // red channel
                  }
                  if(renderOverlap) {
                    /*
                    var stencilPoint = stencilProject(x, y);

                    var off = Math.round(stencilPoint[0]) + Math.round(stencilPoint[1]) * w;
                    var list = [off - 1, off, off + 1, off - w, off - w - 1, off - w + 1, off + w, off + w - 1, off + w + 1];
                    var s = 0;
                    var stencilLength = cw * ch;
                    for(var stencilOff of list) {
                        if(stencilOff >=0 && stencilOff < stencilLength) {
                            s+=stencilMap[stencilOff];
                        }
                    }
                    */

                    var [sPx, sPy] = stencilProject(x, y);

                    sPx = Math.round(sPx);
                    sPy = Math.round(sPy);

                    var s = 0;

                    for(var ox of sList) {
                      for(var oy of sList) {
                        var sx = sPx + ox;
                        var sy = sPy + oy;
                        s+= (sx >= 0 && sx < cw && sy >= 0 && sy < ch) ? stencilMap[sx + sy * w] : 0;
                      }
                    }

                    if ( s > 0 ) {
                        var a2 = 0.5;
                        r = r * (1 - a2);
                        g = g * (1 - a2);
                        b = b * (1 - a2);
                        alpha = Math.min(255, alpha + 100);
                    }
                  }

                  
                  var grad = Math.abs(gradient(x - sX, y - sY, vMin, vMax));

                  var transMThick = meanThickness * grad;
                  if( Math.abs(v) < transMThick) {
                      var a2 = Math.max(0, 255 - Math.abs(v) * (255 / transMThick));
                      if(a2 > 0 ) {
                        ({ r, g, b, a_: alpha } = blend(0, 0, 0, a2 / 255, r, g, b, alpha / 255));
                        alpha = alpha * 255;
                      }
                  }

                  var transFThick = foldThickness * grad;
                  if( Math.abs(val / absMax) < transFThick) {
                      var a2 = Math.max(0, 255 - Math.abs(val / absMax) * (255 / transFThick));
                      if(a2 > 0 ) {
                        ({ r, g, b, a_: alpha } = blend(255, 255, 255, a2 / 255, r, g, b, alpha / 255));
                        alpha = alpha * 255;
                      }
                  }


                  imgArray[i * 4] = r;
                  imgArray[i * 4 + 1] = g;
                  imgArray[i * 4 + 2] = b;
                  imgArray[i * 4 + 3] = alpha;
                  i++;
              }
            }
            var t2 = performance.now();
            return {image: imgArrayBuffer, time: (t2 - t1) };
        }
        return { pass1, pass2 };
    }

    return TPSVisualizerOff;
});
