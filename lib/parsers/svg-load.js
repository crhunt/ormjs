/* Handling SVG upload/download events. */

ormjs.SVG = class {

    static download(viewID, URItarget) {
        /*
            Execute on click of download button.

            Prepare SVG for download includes 2 important data modifications:
            1. All object data is converted to a json string for recovery if the
                file is uploaded to ORMJS.
            2. Styles associated with the elements are added as inline styles. So
                the SVG displays correctly outside the ORMJS environment.
        */

        // Close popups
        ormjs.PropertyMenu.remove_all_popups(viewID, () => console.log('Popups removed.'));

        // Datum to json string
        var modelID = ormjs.Graph.any_object(viewID).model;
        ormjs.SVG.jsonify(modelID);

        // Add inline styling to SVG
        ormjs.InlineStyle.add(viewID);

        // Apply data to URI target
        var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${viewID}`).node());
        d3.select(`#${URItarget}`)
          .attr('href', "data:image/svg+xml;base64," + ormjs.SVG.utoa( rawSvg ));
        
        // Remove inline styling from svg
        ormjs.InlineStyle.remove(viewID);
    }

    static utoa(data) {
        return btoa(unescape(encodeURIComponent(data)));
    }

    static jsonify(modelID) {
        /*
            Convert all datums into json strings. 
            Add as a string value to the attribute "json".
        */

        var objects = ormjs.models[modelID].objects;
        var jsobjects = ormjs.object_kinds;
        jsobjects.map( (kind) => {
            for ( var objID in objects[kind] ) {
                objects[kind][objID].d3object.attr("json",
                    JSON.stringify( objects[kind][objID].d3object.datum() 
                ));
            }
        });
    }



}

ormjs.InlineStyle = class {

    static remove(viewID) {
        // For every id on the canvas, remove inline style data from the element.
        var idlist = document.getElementById(viewID).querySelectorAll('[id]');
        for (var dv in idlist ) {
            if ( idlist[dv].id ) {
                d3.select("#"+idlist[dv].id).attr("style", null );
            }
        }
    }
    
    static add(viewID) {
        /*
        For every id on the canvas, get it's style data and add to the element.

        This step is required for SVGs to display with ORMJS styling outside
        the ORMJS environment.
        */

        var idlist = document.getElementById(viewID).querySelectorAll('[id]');
        var support = ormjs.InlineStyle.supported();
        for (var dv in idlist ) {
            var n = idlist[dv];
            if ( n.id ) {
                d3.select("#"+n.id).attr("style", () => ormjs.InlineStyle.dumpCSSText(n.id, support) );
                if ( n.id.includes("r-id-entity") ) { ormjs.InlineStyle.add_shape_style(anyID)(n.id); }
                if ( n.id.includes("r-id-value") ) { ormjs.InlineStyle.add_shape_style(n.id); }
                if ( n.id.includes("c-id-constraint") ) { ormjs.InlineStyle.add_shape_style(n.id); }
            }
        }
    }

    static supported() {
        /* 
        Style elements important for exporting SVG with CSS

        Don't want to load all styles for the element because the file size blows up.

            We want to set this with document.styleSheets[1].cssRules but doesn't work in
            browser without a server host because of CORS violations (that aren't there... because
            it's same origin... but Firefox is dumb.) Can't access with XMLHttpRequest because
            then FF realizes it's same origin. Catch 22. So here's a stupid list.
        */
        return ['filter','fill','cursor','opacity','stroke','stroke-width', 'stroke-dasharray',
                'height','width','rx','ry','r','font-family','font-size','paint-order','color', 
                'dominant-baseline','text-anchor']
    }

    static dumpCSSText(anyID, support){
        /* 
          Get a string of styles associated with the element that are taken from
          the stylesheet orm-style.css.
         */
    
        var elem = document.getElementById(anyID);
        var o = window.getComputedStyle(elem); // Includes CSS set by stylesheet
        var s = '';
        if ( arguments.length == 2 ) {
            for(var i in o) {
                if ( support.includes(o[i]) ) { s+=o[i] + ':' + o.getPropertyValue(o[i])+';'; }
            }
        } else {
            for(var i in o) {
                s+=o[i] + ':' + o.getPropertyValue(o[i])+';';
            }
        }
        return s;
    }

    static add_shape_style(anyID) {

        /* 
            Need to be explicitly set as attrs for downloaded SVG appearance. 
        */
    
        var stylelist = ['rx','ry','fill','opacity','height','stroke-dasharray'];
        var elem = document.getElementById(anyID);
        var o = window.getComputedStyle(elem); // Includes CSS set by stylesheet
    
        var obj = d3.select("#"+anyID);
        for (var i in o) {
            if ( stylelist.includes(o[i]) ) {
                obj.attr(o[i], o.getPropertyValue(o[i]));
            }
        }
    }
}