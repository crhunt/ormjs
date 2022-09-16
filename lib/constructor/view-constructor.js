/*
    Constructing the svg
*/

var ormjs;

ormjs.View = class {
    d3object;
    id;
    name;
    model;
    parent;
    kind = "view";
    traversal = false;
    traversal_target = null;
    highlight = false;

    constructor(data) {

        if(!data.d3object) {
            // Create new d3 object
            this.parent = data.parent;
            this.model = data.model;
            this.id = ormjs.View.generateID(this.model);
            this.create_d3object(data);
            this.name_from_id();
        } 
        else {
            // Create new view object with provided d3 object
            var d = data.d3object.datum();
            if (data.model) {
                this.model = data.model;
                this.id = ormjs.View.generateID(this.model);
            } else {
                this.model = d.model;
                this.id = d.id;
            }
            data.d3object.attr("id", this.id);
            this.parent = data.parent ? data.parent
                                      : d.parent;
            this.d3object = data.d3object;
            data.name ? this.name = data.name : this.name_from_id();
        }

        this.d3object.datum().id = this.id;
        this.d3object.datum().model = this.model;
        this.d3object.datum().parent = this.parent;

        // Add svg actions
        this.actions();
        
        // Record object
        this.record();

        if (ormjs.models[this.model].currentview == null) {
            this.set_current();
        }
    }

    static generateID(model) {
        return ormjs.Model.generateID(model,"view")
    }

    name(name) {
        if(arguments.length > 0) { 
            this.name = name;
        } else {
            return this.name
        }
    }

    name_from_id() {
        this.name = this.id.split("-")[2];
    }

    static default_scaling() {
        var param = {
            scale: ormjs.size.view.scale,
            scale_min: ormjs.size.view.scale_min,
            scale_max: ormjs.size.view.scale_max
        };
        param.inv_scale = param.scale_max + param.scale_min - param.scale;

        return param
    }

    static default_datum() {
        var d = ormjs.View.default_scaling();
        d.kind = "view";
        return d
    }

    create_d3object(data) {

        var def_d = ormjs.View.default_datum();
        var d = ormjs.Graph.fill_datum(data, def_d);
        d.id = this.id;
        
        //Create SVG element
        d3.select(`#${this.parent}`).html(""); // Clear current content
        var newsvg = d3.select(`#${this.parent}`)
            .append("svg")
                .datum( d )
                .attr("id", this.id)
                .attr("class", "ormjs-svg_prototype")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                // d.scale
                //.attr("viewBox", () => ormjs.View.set_viewbox(d.inv_scale))
                .attr("scaleValue", d.inv_scale)
                .attr("shape-rendering", "geometricPrecision");

        this.d3object = newsvg;
        this.set_viewbox();
        
    }

    record() {
        // Add new svg to global record
        //orm.views[this.id] = this;
        ormjs.models[this.model].objects[this.kind][this.id] = this;
    }

    set_viewbox() {
        /* Rescale SVG using viewBox attribute.
           Set the string for the rescale. */
        var svgscale = this.d3object.attr("scaleValue");

        var vbstring =  "-" + svgscale/2 + ", -" + svgscale/2 +
               ", " + svgscale + ", " + svgscale;

        this.d3object.attr("viewBox", vbstring);
    }

    parent_size() {
        /* Width and height of parent element */
        var cnvsw = document.getElementById(this.parent).offsetWidth;
        var cnvsh = document.getElementById(this.parent).offsetHeight;
        var r = cnvsh / cnvsw;
        return {"width": cnvsw, "height": cnvsh, "ratio": r}
    }

    static from_parent(parentID) {
        /* Return view contained by parent ID */
        var object_divs = d3.select(`#${parentID}`).selectAll(".ormjs-svg_prototype").nodes();
        var viewID = object_divs.map( (obj) => { return obj.id} )[0];
        return ormjs.Graph.any_object(viewID);
    }

    svgscale_from_element(id) {
        var d = this.d3object.datum();
        d.scale = ormjs.GraphUtils.parse_number( d3.select(`#${id}`).property("value") );
        d.scale_min = ormjs.GraphUtils.parse_number( d3.select(`#${id}`).property("min") );
        d.scale_max = ormjs.GraphUtils.parse_number( d3.select(`#${id}`).property("max") );

        this.update_svgscale();
    }

    scale_event_listener(id) {
        // Update based on element content
        this.svgscale_from_element(id);
        // Add listener
        const el = document.getElementById(id);
        el.addEventListener("change", () => { this.svgscale_from_element(id) }, false);
    }

    update_svgscale(scaleval) {
        /* Update viewBox attribute. */
        var d = this.d3object.datum();

        if (arguments.length == 1) { d.scale = scaleval; }

        // Invert the scale so slider is more intuitive (slide right to zoom in)
        d.inv_scale = d.scale_max + d.scale_min - d.scale;
        
        // Set viewBox
        this.d3object
            //.attr("viewBox", () => ormjs.View.set_viewbox(d.inv_scale))
            .attr("scaleValue", d.inv_scale);
        this.set_viewbox();
    }

    set_current() {
        //svg = d3.select(`#${this.id}`);
        ormjs.models[this.model].set_current_view(this.id);
        this.update_svgscale();
    }

    actions() {

        /*
            Click events on the SVG.
         */

        var svgMenu = ormjs.OptionMenu.svg_menu(this);
    
        this.d3object
            .on("contextmenu", d3.contextMenu(svgMenu))
            .on("mousedown", ormjs.HighlightRegion.svg_mousedown)
            .on("click", (event) => { d3.select("#ormjs-hrect").remove(); })
            .on("dblclick", (event) => {
                event.stopPropagation();
                // Just in case
                d3.select("#ormjs-hrect").remove();
                ormjs.HighlightRegion.unselect_all(this.id);
                // Get mouse position
                var mouse = d3.pointer(event);
                if (event.shiftKey && event.ctrlKey) {
                    // Create value on ctrl+shift+doubleclick
                    new ormjs.Value({x: mouse[0], y: mouse[1], model:this.model})
                } else if (event.shiftKey) {
                    // Create rolebox on shift+doubleclick
                    new ormjs.Predicate({x: mouse[0], y: mouse[1], model:this.model})
                } else {
                    // Create entity on doubleclick
                    new ormjs.Entity({x: mouse[0], y: mouse[1], model:this.model})
                }
            });
        
        // Popup actions
        d3.select("body")
            .on("keypress", (event) => {
                if(event.keyCode === 13 && ormjs.propmenu.open_popups.length > 0) {
                    ormjs.PropertyMenu.enter_last_popup();
                }
            })
    }

    objects_in_view() {
        var object_classes = ["ormjs-entity_prototype", "ormjs-value_prototype", 
            "ormjs-predicate_prototype", "ormjs-constraint_prototype"];
        var objIDs = object_classes.map( (cls) => {
            var object_divs = d3.select(`#${this.id}`).selectAll("."+cls).nodes();
            return object_divs.map( (obj) => { return obj.id} );
        }).flat().filter(v=>v);
        return objIDs
    }

    everything_in_view() {
        var object_classes = ["ormjs-entity_prototype", "ormjs-value_prototype", 
            "ormjs-predicate_prototype", "ormjs-rolebox_prototype", "ormjs-constraint_prototype", 
            "ormjs-connector_prototype"];
        var objIDs = object_classes.map( (cls) => {
            var object_divs = d3.select(`#${this.id}`).selectAll("."+cls).nodes();
            return object_divs.map( (obj) => { return obj.id} );
        }).flat().filter(v=>v);
        return objIDs
    }

    delete() {
        // Remove objects in view
        this.clear();

        // Remove d3object visualization
        this.d3object.remove();

        // ** Remove the view from records **
        var model = ormjs.models[this.model];
        delete model.objects[this.kind][ this.id ];

        // Update ORM
        model.update();
    }

    clear() {
        /* Remove all objects in this view from the model and remove svg data. */

        var objectIDs = this.objects_in_view();
        objectIDs.map( (objID) => {
            ormjs.Graph.any_object(objID).delete();
        } );

    }

}