define([], function() {

  class ProjectPlane extends PIXI.Mesh
  {
      constructor(verticesX, verticesY)
      {
          super(new PIXI.MeshGeometry(), new PIXI.MeshMaterial(PIXI.Texture.EMPTY));
          this.verticesX = verticesX || 10;
          this.verticesY = verticesY || 10;
          //this._ready = true;
          this._frontFaceCulling = false;
      }

      generateUvIndices()
      {
          const total = this.verticesX * this.verticesY;
          const uvs = [];
          const indices = [];
          const texture = this.texture;
          const segmentsX = this.verticesX - 1;
          const segmentsY = this.verticesY - 1;
          for (let i = 0; i < total; i++)
          {
              const x = (i % this.verticesX);
              const y = ((i / this.verticesX) | 0);
              uvs.push(
                  texture._uvs.x0 + ((texture._uvs.x1 - texture._uvs.x0) * (x / (this.verticesX - 1))),
                  texture._uvs.y0 + ((texture._uvs.y3 - texture._uvs.y0) * (y / (this.verticesY - 1)))
              );
          }
          //  cons
          const totalSub = segmentsX * segmentsY;
          for (let i = 0; i < totalSub; i++)
          {
              const xpos = i % segmentsX;
              const ypos = (i / segmentsX) | 0;
              const value = (ypos * this.verticesX) + xpos;
              const value2 = (ypos * this.verticesX) + xpos + 1;
              const value3 = ((ypos + 1) * this.verticesX) + xpos;
              const value4 = ((ypos + 1) * this.verticesX) + xpos + 1;
              indices.push(value, value2, value3);
              indices.push(value2, value4, value3);
          }
          this.uvs = new Float32Array(uvs);
          this.indices = new Uint16Array(indices);
          this.updateGeometry();
      }
      updateGeometry() {
        this.geometry = new PIXI.MeshGeometry(this.vertices, this.uvs, this.indices);
      }

      setTexture(texture) {
        this.texture = texture;
        this.generateUvIndices();
      }

      setTPSPositions(tpsPositions, sourceProj) {
        this.tpsPositions = tpsPositions;
        this.sourceProj = sourceProj;
      }

      setFrontFaceCulling(value) {
          this._frontFaceCulling = value;
      }

      generateProjectedVerts(projection) {
        var verts = [];
        const total = this.verticesX * this.verticesY;
        for(var i = 0; i < total; i++) {
          var p = this.tpsPositions[i];
          var pI = this.sourceProj.invert([p[0],p[1]]);
          var pL = projection([pI[1],pI[0]]);
          verts.push(pL.x, pL.y);
        }
        this.vertices = new Float32Array(verts);
        //this.indexDirty = true;
        this.updateGeometry();
      }

      generateVerts(s, tx, ty) {
        var verts = [];
        const total = this.verticesX * this.verticesY;
        for(var i = 0; i < total; i++) {
          var p = this.tpsPositions[i];
          var px = p[0] * s + tx;
          var py = p[1] * s + ty;
          verts.push(px, py);
        }
        this.vertices = new Float32Array(verts);
        //this.indexDirty = true;
        this.updateGeometry();
      }


      _render(renderer) {
          if(this._frontFaceCulling) {
          //  renderer.state.push();
            renderer.state.setCullFace(true);
            renderer.state.setFrontFace(false);
          }
          super._render(renderer);
          //if(this._frontFaceCulling) {
          //  renderer.state.pop();
          //}
      }
    }

  return ProjectPlane;
});
