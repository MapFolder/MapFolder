define(['libs/papa/papaparse'], function(Papa) {

  function loadImg(url) {
    return new Promise((resolve, reject) => {
      var newImg = new Image();
      newImg.onload = function() {
        resolve(this);
      }
      newImg.crossOrigin = "Anonymous";
      newImg.src = url;
    });
  }

  function loadCSV(csvFile) {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        download: true,
        header:true,
        complete: function(results, file) {
          resolve(results.data);
        }
      });
    });
  }

  function imgToDataURL(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    console.log(img.src);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL();
  }


  class DatasetManager {

    constructor(maxW, maxH) {
      this.maxW = maxW;
      this.maxH = maxH;
      this.dataSet = null;
    }

    calcScaling(imgW, imgH, maxW, maxH) {
      var scale = 1;
      var renderW = 0;
      var renderH = 0;
      if(imgW > maxW || imgH > maxH) {
        if( imgW > imgH) {
          renderW = maxW;
          renderH = Math.round(renderW * imgH / imgW);
          scale = renderW / imgW;
        } else {
          renderH = maxW;
          renderW = Math.round(renderH * imgW / imgH);
          scale = renderH / imgH;
        }
      } else {
          renderW = imgW;
          renderH = imgH;
      }
      return { scale, renderW, renderH }
    }

    convertCtrlPoints(csv) {
      var ctrlPoints = [];
      for (var i = 0; i < csv.length; i++) {
          var row = csv[i];

          if(row.x && row.y && row.lon && row.lat) {
              var x1 = row.x;
              var y1 = row.y;
              var x2 = Number(row.lon);
              var y2 = Number(row.lat);
              ctrlPoints.push({x1, y1, x2, y2, enabled: true, annotations: []
              });
          }
      }
      return ctrlPoints;
    }

    scaleImgCtrlPoints(ctrlPoints, scale) {
      return ctrlPoints.map(p => ({
        x1: p.x1 * scale,
        y1: p.y1 * scale,
        x2: p.x2,
        y2: p.y2,
        enabled: p.enabled,
        annotations: p.annotations
      }));
    }

    scaleFeatures(features, scale) {
      return features.map(feature => ({
        type: feature.type,
        annotations: feature.annotations,
        polygon: feature.polygon.map(ring => ring.map(point => point.map(coord => coord * scale))),
        projPolygon: feature.projPolygon
      }));
    }


    importPair(csvFile, imgUrl) {
      return Promise.all([loadImg(imgUrl), loadCSV(csvFile)])
      .then(([img, csv]) => {
        var { scale, renderW, renderH } = this.calcScaling(img.width, img.height, this.maxW, this.maxH);
        this.dataSet = {
          img,
          scale,
          renderW,
          renderH,
          ctrlPoints: this.scaleImgCtrlPoints(this.convertCtrlPoints(csv), scale),
          features: []
        };
        console.log(this.dataSet);
        return this.dataSet;
      });
    }

    importJSON(json) {
      var reservedProps = [ 'imageX', 'imageY', 'lat', 'lon', 'imagePolygon', 'type' ];

      return loadImg(json.img)
      .then(img => {
        var { scale, renderW, renderH } = this.calcScaling(json.imgWidth, json.imgHeight, this.maxW, this.maxH);

        var ctrlPoints = [];
        var features = [];
        for(var i = 0; i < json.features.length; i++) {
            var f = json.features[i];
            var annotations = [];
            for(var prop in f.properties) {
              if(reservedProps.indexOf(prop) === -1) {
                annotations.push({key:prop, value:f.properties[prop]});
              }
            }
            if(f.geometry.type === 'Point') {
              var [x2, y2] = f.geometry.coordinates;
              var x1 = f.properties.imageX;
              var y1 = f.properties.imageY;
              ctrlPoints.push({x1, y1, x2, y2, enabled: true, annotations});
            }
            if(f.geometry.type === 'Polygon') {
              var type = f.properties.type;
              var polygon = f.properties.imagePolygon;
              var projPolygon = f.geometry.coordinates;
              features.push({type, polygon, projPolygon, annotations});
            }
        }

        this.dataSet = {
          img,
          scale,
          renderW,
          renderH,
          ctrlPoints: this.scaleImgCtrlPoints(ctrlPoints, scale),
          features: this.scaleFeatures(features, scale)
        };
        return this.dataSet;
      });
    }

    keyValueArrayToHash(a) {
      var h = {};
      for(var item of a) {
        h[item.key] = item.value;
      }
      return h;
    }

    ctrlPointToGeoJSONFeature(p) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.x2, p.y2]
        },
        properties: {
          imageX: p.x1,
          imageY: p.y1,
          lon: p.x2,
          lat: p.y2,
          ...this.keyValueArrayToHash(p.annotations)
        }
      }
    }

    featureToGeoJSONFeature(feature) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: feature.projPolygon
        },
        properties: {
          type: feature.type,
          imagePolygon: feature.polygon,
          ...this.keyValueArrayToHash(feature.annotations)
        }
      }
    }


    exportJSON() {
      var dataSet = this.getCurDataset();
      var invScale = 1 / dataSet.scale;

      var scaledPoints = this.scaleImgCtrlPoints(dataSet.ctrlPoints, invScale);
      var scaledFeatures = this.scaleFeatures(dataSet.features, invScale);

      var collection = [];

      for(var p of scaledPoints) {
        collection.push(this.ctrlPointToGeoJSONFeature(p));
      }

      for(var f of scaledFeatures) {
        collection.push(this.featureToGeoJSONFeature(f));
      }

      return {
        type: 'FeatureCollection',
        features: collection,
        img: dataSet.img.src,
        imgWidth: dataSet.img.width,
        imgHeight: dataSet.img.height
      }
    }

    getCurDataset() {
      return this.dataSet;
    }

  }

  return DatasetManager;

});
