define([
    './MeshCollision',
    './triangulate',
    './constants',
    'libs/EventEmitter.min.js',
    'd3'
], function(MeshCollision, triangulate, constants, EventEmitter, d3) {

    /*
    function drawPolygon(ctx, path) {
      for(var i = 0; i < path.length; i++) {
        var p = path[i];
        if (i === 0) {
          ctx.moveTo(p[0], p[1]);
        } else {
          ctx.lineTo(p[0], p[1]);
        }
      }
    }

    function projectPath(path, project) {
      return path.map((o) => {
        var {x, y} = project([-o[1], o[0]]);
        return [x, y];
      });
    }

    function drawPixiMultiPolygon(ctx, multi, project) {
      for(var poly of multi) {
        drawPolygon(ctx, projectPath(poly[0], project));
        ctx.beginHole();
        for(var i = 1; i < poly.length; i++) {
          drawPolygon(ctx, projectPath(poly[i], project));
        }
        ctx.endHole();
      }
    }
    */

const vertexSrc = `
precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTextureMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
}
`;

const fragmentSrc = `
precision mediump float;
varying vec2 vTextureCoord;
uniform vec4 uColor;

uniform sampler2D uSampler;

void main(void)
{
    float alpha = step(0.5, mod((gl_FragCoord.x + gl_FragCoord.y) / 10.0, 2.0)) * 0.8;
    gl_FragColor = vec4(uColor.rgb * alpha, alpha);
}
`;

    function projectVertexBuffer(buffer, project) {
      var i = 0;
      while(i < buffer.length) {
        var p = project({x1: buffer[i], y1: buffer[i + 1]});
        buffer[i++] = p.x;
        buffer[i++] = p.y;
      }
      return buffer;
    }
    class LeafLetFeatureModule {

      constructor() {
        this.graphics = new PIXI.Graphics();
        this.mesh = new PIXI.Mesh(
          new PIXI.MeshGeometry(),
          new PIXI.MeshMaterial(PIXI.Texture.WHITE, {
            alpha: 1,
            tint: 0xcccc00,
            program: PIXI.Program.from(vertexSrc, fragmentSrc)
          })
        );
        this.mesh.shader.tint = constants.selectedColor;
        this.mesh.alpha = 1;
        this.mesh.filters = [
          //new PIXI.filters.GlowFilter({knockout: false, distance: 10, outerStrength: 5, innerStrength: 0 }),
          new PIXI.filters.DropShadowFilter()
        ];

        this.hitMapRTree = null;
        this.features = null;
        this.tris = null;
        this.curFeatureId = -1;
      }

      hitTest(x, y) {
        if(this.hitMapRTree) {
          var tris = MeshCollision.pointTestTriMesh([x, y], this.hitMapRTree);
          return (tris[0] === undefined) ? -1 : tris[0];
        }
        return -1;
      }

      setCurFeature(id) {
        this.curFeatureId = id;
      }

      setFeatures(features, prop, isMulti) {
        this.features = features;
        this.curFeatureId = -1;

        console.time('triangulate features libtess');
        if(isMulti) {
          this.tris = MeshCollision.triangulateGeoJSONMultiPolyLibtess(features, prop, triangulate);
        } else {
          this.tris = MeshCollision.triangulateGeoJSONLibtess(features, prop, triangulate);
        }
        console.timeEnd('triangulate features libtess');

        if(this.tris) {
          this.hitMapRTree = MeshCollision.triMeshToRTree(this.tris);
        }
      }

      render(project) {
        if(this.tris && (this.curFeatureId > -1)) {
          var tri = this.tris[this.curFeatureId];
          var projected = projectVertexBuffer(tri.vertices.slice(), project);
          this.mesh.geometry.getBuffer('aVertexPosition').update(projected);
          this.mesh.geometry.getBuffer('aTextureCoord').update(new Float32Array(projected.length));
          this.mesh.geometry.getIndex().update(tri.indices);
        } else {
          this.mesh.geometry.getIndex().update(new Uint16Array(0));
        }
      }
    }

    return LeafLetFeatureModule;
});
