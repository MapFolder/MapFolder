define([], function() {

    return function() {

        return {
            view: (vnode) => m('.image-container', {class:vnode.attrs.class},
                [
                    m('.header', vnode.attrs.title),
                    m('.content', vnode.attrs.content)
                ]
            )
        };
        
    }

});
