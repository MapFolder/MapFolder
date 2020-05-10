define(['libs/tps/invert'], function(invert) {
    
    function transCPoints(controlPoints) {
        var cPoints = [];
        for(var i = 0; i < controlPoints.length; i++) {
            var cP = controlPoints[i];
            cPoints[i] = [[cP.x1, cP.y1], [cP.x2, cP.y2]];
        }
        return cPoints;
    }
    
    // ex: sum(a_x)
    function sumComp(cPoints, vec, comp) {
        var sum = 0;
        for(var i = 0; i < cPoints.length; i++) {
            sum+= cPoints[i][vec][comp];
        }
        return sum;
    }
    // ex: sum(a_x^2 + a_y^2)
    function sumSquared(cPoints, vec) {
        var sum = 0;
        for(var i = 0; i < cPoints.length; i++) {
            sum+= cPoints[i][vec][0] * cPoints[i][vec][0] + cPoints[i][vec][1] * cPoints[i][vec][1];
        }
        return sum;
    }
    // sum(a_x * b_x + a_y * b_y)
    function sumMulCross1(cPoints) {
        var sum = 0;
        for(var i = 0; i < cPoints.length; i++) {
            sum+= cPoints[i][0][0] * cPoints[i][1][0] + cPoints[i][0][1] * cPoints[i][1][1];
        }
        return sum;
    }
    // sum(a_x * b_y - a_y * b_x)
    function sumMulCross2(cPoints) {
        var sum = 0;
        for(var i = 0; i < cPoints.length; i++) {
            sum+= cPoints[i][0][0] * cPoints[i][1][1] - cPoints[i][0][1] * cPoints[i][1][0];
        }
        return sum;
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
    
    
    
    // calculate least squares fitting using rotation, uniform scale and translation
    // derived from opencv estimateRigidTransform
    // see: https://math.stackexchange.com/questions/2136719/least-squares-fit-to-find-transform-between-points
    return function(controlPoints) {
        
        var cPs = transCPoints(controlPoints);
        var N = cPs.length;
        
        var A = 
        [ [ sumSquared(cPs, 0),                  0, sumComp(cPs, 0, 0), sumComp(cPs, 0, 1) ],
          [                  0, sumSquared(cPs, 0),-sumComp(cPs, 0, 1), sumComp(cPs, 0, 0) ],
          [ sumComp(cPs, 0, 0),-sumComp(cPs, 0, 1),                  N,                  0 ],
          [ sumComp(cPs, 0, 1), sumComp(cPs, 0, 0),                  0,                  N ]];
        
        var b =
        [ sumMulCross1(cPs),
          sumMulCross2(cPs),
               sumComp(cPs, 1, 0),
               sumComp(cPs, 1, 1)];
               
        var invA = invert(A);
        var x = matMul(invA, b);
        // x[2] and x[3] are correct translation values
        // however x[0] and x[1] need to be transformed into scale and angle
        var theta = Math.atan(x[1] / x[0]);
        var scale = x[0] / Math.cos(theta);
        
        // we want to return the transformation matrix
        var m =
        [ [ x[0], -x[1], x[2] ],
          [ x[1],  x[0], x[3] ],
          [    0,     0,    1 ]];
         
         var invM = invert(m);
         var id1 = matMul2(invA, A);
         var id2 = matMul2(A, invA);
         var id3 = matMul2(invM, m);
         
         //console.log(cPs);
         console.log("scale:", scale);
         console.log("theta:", theta);
         //console.log("A", A);
         //console.log("invA", invA);
         //console.log("b", b);
         //console.log("transform matrix:", m);
         //console.log(id1, id2, id3);
         
         //console.log("scale:", scale);

        return m;
    }
    
    
});