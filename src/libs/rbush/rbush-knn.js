// https://github.com/mourner/rbush-knn
define(['./TinyQueue'], function(Queue) {

    function knn(tree, x, y, n, predicate) {
        var node = tree.data,
            result = [],
            toBBox = tree.toBBox,
            i, child;

        var queue = new Queue(null, compareDist);

        while (node) {
            for (i = 0; i < node.children.length; i++) {
                child = node.children[i];
                queue.push({
                    node: child,
                    isItem: node.leaf,
                    dist: boxDist(x, y, node.leaf ? toBBox(child) : child)
                });
            }

            while (queue.length && queue.peek().isItem) {
                var candidate = queue.pop().node;
                if (!predicate || predicate(candidate))
                    result.push(candidate);
                if (n && result.length === n) return result;
            }

            node = queue.pop();
            if (node) node = node.node;
        }

        return result;
    }

    function compareDist(a, b) {
        return a.dist - b.dist;
    }

    function boxDist(x, y, box) {
        var dx = axisDist(x, box.minX, box.maxX),
            dy = axisDist(y, box.minY, box.maxY);
        return dx * dx + dy * dy;
    }

    function axisDist(k, min, max) {
        return k < min ? min - k :
               k <= max ? 0 :
               k - max;
    }

    return knn;
});

