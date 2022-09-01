/* Handling SVG upload/download events. */

ormjs.SVG = class {

    /* Download */

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

        // Set dimensions
        ormjs.SVG.set_svg_dimensions(viewID);

        // Apply data to URI target
        var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${viewID}`).node());
        var svgURI = "data:image/svg+xml;base64," + ormjs.SVG.utoa( rawSvg );
        if (arguments.length > 1) {
            d3.select(`#${URItarget}`).attr('href', svgURI);
        }
        
        // Remove inline styling from svg
        ormjs.InlineStyle.remove(viewID);

        // Un-Set dimensions
        ormjs.SVG.unset_svg_dimensions(viewID);

        return svgURI
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
                    JSON.stringify( objects[kind][objID].d3object.datum() ) 
                );
            }
        });
    }

    static set_svg_dimensions(viewID) {

        // Div parent of view: get canvas dimensions from parent
        var svgparent = ormjs.GraphUtils.parent_node_id(viewID);
        
        // set SVG size to parent dimensions
        var cnvsw = document.getElementById(svgparent).offsetWidth;
        var cnvsh = document.getElementById(svgparent).offsetHeight;
        
        d3.select(`#${viewID}`)
            .attr("width", cnvsw)
            .attr("height", cnvsh);
    }

    static unset_svg_dimensions(viewID) {
        d3.select(`#${viewID}`)
            .attr("width", "100%")
            .attr("height", "100%");
    }

    /* Upload */

    static upload(file, target_view, _callback) {
        /*
            Execute on upload of an ORMJS-generated SVG to ORMJS.

            The SVG preparation process includes 3 important steps:
            1. Inline style data is removed. This is because some of these settings
               (such as entity width) may change during interaction.
            2. Model state information is extracted from the SVG. JSON data strings
               are converted to datum for each element.
            3. Each object is populated with the ORMJS actions it can perform.
               This is necessary to interact and change the model.
        */

        var reader = new FileReader();
        reader.readAsText( file );
    
        reader.onload = function(event) { 

            // Read data
            var data = event.target.result;
        
            /* Add new svg to parent */
            ormjs.SVG.to_view(target_view, data);

            // Update ORM
            ormjs.Graph.model_from_id(target_view).update();

            _callback();

        }
        reader.onerror = error => console.log(error);

    }

    static to_view(viewID, data) {
        
        // Clear current view contents
        var view = ormjs.Graph.any_object(viewID);
        view.clear();

        // Protect id names
        data = data.replaceAll("ormjsid","ormjsnid");

        // Add as inner html
        d3.select(`#${view.parent}`).html(data);
        // Update ids to model
        var refmap = ormjs.SVG.create_model_ids_from_view(view);
        
        // Get current svgid
        var svgid = d3.select(`#${view.parent}`)
                      .selectAll(".ormjs-svg_prototype").nodes()[0].id;
        refmap[svgid] = view.id;
        
        // Parse datum
        view.d3object.datum( JSON.parse(d3.select(`#${svgid}`).attr("json")) );
        // Update datum to new id
        var d = view.d3object.datum();
        refmap[d.model] = view.model;
        refmap[d.parent] = view.parent;

        // Update all IDs to agree with model
        for (var oid in refmap) {
            data = data.replaceAll(`${oid}&quot;`, `${refmap[oid]}&quot;`);
            data = data.replaceAll(`${oid}"`, `${refmap[oid]}"`);
        }

        // Add again as inner html, with new id's
        d3.select(`#${view.parent}`).html(null);
        d3.select(`#${view.parent}`).html(data);
        // Update view to new d3 object
        view.d3object = d3.select(`#${view.id}`);
        view.d3object.datum( JSON.parse(view.d3object.attr("json")) );
        // Add actions
        view.actions();
        // Update scale to match datum
        view.update_svgscale();
        ormjs.SVG.unset_svg_dimensions(viewID);

        // Remove inline style
        ormjs.InlineStyle.remove(view.id);

        // Create objects from view content
        ormjs.SVG.populate_model_from_view(view);

    }

    static create_model_ids_from_view(view) {

        var class_type = ["connector_prototype", "predicate_prototype", 
                          "constraint_prototype", 
                          "entity_prototype", "value_prototype"];
        var class_kind = { 
            "connector_prototype": "connector", 
            "predicate_prototype": "predicate", 
            "constraint_prototype": "constraint", 
            "entity_prototype": "entity", 
            "value_prototype": "value" };
        var refmap = {};
        class_type.map( (cls) => { 
            var object_divs = d3.select(`#${view.parent}`).selectAll(`.ormjs-${cls}`);
            for ( var k in object_divs.nodes() ) { 
                // Add object to orm list
                var anyID = object_divs.nodes()[k].id;
                refmap[anyID] = ormjs.Model.generateID(view.model, class_kind[cls]);
            }
        } );

        return refmap

    }

    static populate_model_from_view(view) {
        /*
            Two actions are key to populating the state:
            1. Populate the datum of each d3 object with the JSON string that was
               set at download.
            2. Create an ormjs object for each d3 object.

            Note: Order is important! The various objects are populated in an order than
            prevents errors when model update is triggered.
        */

        // Create model objects from d3 object
        // Order matters!
        var class_type = ["connector_prototype", "rolebox_prototype", 
            "predicate_prototype", "constraint_prototype", 
            "entity_prototype", "value_prototype"];
        class_type.map( (cls) => {
            ormjs.SVG.populate_class(view, cls);
        });
    }

    static populate_class(view, class_name) {
        // Get all divs of class
        var object_divs = d3.select(`#${view.parent}`).selectAll(`.ormjs-${class_name}`);

        // Iterate through nodes of class
        for ( var k in object_divs.nodes() ) { 
            // Add object to orm list
            var anyID = object_divs.nodes()[k].id;
            var d3object = d3.select("#"+anyID);
            // Populate datum
            d3object.datum( JSON.parse(d3object.attr("json")) );
            // Create object
            if( class_name == "connector_prototype") { 
                var obj = new ormjs.Connector({d3object: d3object}); 
                obj.record();
            }
            if( class_name == "constraint_prototype") { 
                var obj = new ormjs.Constraint({d3object: d3object}); 
            }
            if( class_name == "entity_prototype") { 
                var obj = new ormjs.Entity({d3object: d3object}); 
            }
            if( class_name == "value_prototype") { 
                var obj = new ormjs.Value({d3object: d3object}); 
            }
            if( class_name == "predicate_prototype") { 
                var obj = new ormjs.Predicate({d3object: d3object}); 
            }
            if( class_name == "rolebox_prototype") { 
                var obj = new ormjs.Rolebox({d3object: d3object}); 
            }
        }
    }

    /* SVG in page */

    static load_page(_callback) {
        // Find all views in the page
        var view_divs = d3.select(`body`).selectAll(".ormjs-svg_prototype").nodes();
        var viewIDlist = view_divs.map( (obj) => { return obj.id} );
        viewIDlist.map( (viewID) => {
            // Get parent ID
            var parentID = d3.select( d3.select(`#${viewID}`).node().parentNode ).node().id;
            var data = d3.select(`#${parentID}`).html();
            // Check if model exists
            var d = JSON.parse(d3.select(`#${viewID}`).attr("json"));
            if(!(d.model in ormjs.models)) {
                var model = new ormjs.Model({id:d.model});
            }
            // Check if view exists
            if(!(viewID in ormjs.models[model.id].objects.view)) {
                var view = new ormjs.View({model: model.id, parent: parentID});
            } else {
                var view = ormjs.models[model.id].objects.view[viewID];
                if (!(parentID == view.parent)) {
                    view = new ormjs.View({model: model.id, parent: parentID});
                }
            }
            // Transform svg into ormjs view
            ormjs.SVG.to_view(view.id, data);

            ormjs.models[view.model].update();
        } );

        if (!(_callback == null)) { _callback(); }
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
                if ( n.id.includes("r-ormjsid-entity") ) { ormjs.InlineStyle.add_shape_style(n.id); }
                if ( n.id.includes("r-ormjsid-value") ) { ormjs.InlineStyle.add_shape_style(n.id); }
                if ( n.id.includes("c-ormjsid-constraint") ) { ormjs.InlineStyle.add_shape_style(n.id); }
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