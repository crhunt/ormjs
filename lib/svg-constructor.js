/*
    Constructing the svg
*/

/*----- Global definitions -----*/

var orm; // Defined in parse-svg
var svg; // Defined here

class View {
    d3object;
    id;
    kind = "view";
    ref = "views";

    constructor(data) {

        if (arguments.length == 0) {
            this.id = View.generateID();
            this.create_d3object({});
        }
        else if(!data.d3object) {
            // Create new d3 object
            this.id = View.generateID();
            this.create_d3object(data);
        } 
        else {
            // Create new constraint object with provided d3 object
            this.id = data.d3object.attr("id");
            this.d3object = data.d3object;
        }
        
        // Record object
        this.record();
    }

    static generateID() {
        // Generate ID for a new constraint
        var svgID = "canvas-svg-" + orm.highestViewID.toString();
        orm.highestViewID += 1;
        return svgID
    }

    static default_scaling() {
        var param = {
            scale: parse_number( get_css_variable('--svg-scale') ),
            scale_min: parse_number( get_css_variable('--svg-scale-min') ),
            scale_max: parse_number( get_css_variable('--svg-scale-max') ),
        };
        param.inv_scale = param.scale_max + param.scale_min - param.scale;

        return param
    }

    static default_datum() {
        var d = View.default_scaling();
        d.kind = "view";
        return d
    }

    create_d3object(data) {

        var def_d = View.default_datum();
        var d = Graph.fill_datum(data, def_d);
        
        //Create SVG element
        var newsvg = d3.select("#canvas")
            .append("svg")
                .datum( d )
                .attr("id", this.id)
                .attr("class", "svg_prototype")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                .attr("viewBox", () => View.set_viewbox(d.scale))
                .attr("scaleValue", d.inv_scale)
                .attr("shape-rendering", "geometricPrecision");

        this.d3object = newsvg;
        // Add svg actions
        this.actions();
        
    }

    record() {
        // Add new svg to global record
        orm.views[this.id] = this;
    }

    static set_viewbox(svgscale) {
        /* Rescale SVG using viewBox attribute.
           Set the string for the rescale. */
        return "-" + svgscale/2 + ", -" + svgscale/2 +
               ", " + svgscale + ", " + svgscale;
    }

    static set_svgscale(svgobj) {
        /* Set the viewBox attribute based on value of #svgscale attribute. */
        var d = svgobj.d3object.datum();
        d.scale = parse_number( d3.select("#svgscale").property("value") );
        d.scale_min = parse_number( d3.select("#svgscale").property("min") );
        d.scale_max = parse_number( d3.select("#svgscale").property("max") );

        // Invert the scale so slider is more intuitive (slide right to zoom in)
        d.inv_scale = d.scale_max + d.scale_min - d.scale;
        
        // Set viewBox
        svgobj.d3object
            .attr("viewBox", () => View.set_viewbox(d.inv_scale))
            .attr("scaleValue", d.inv_scale);
    }

    link_svgscale() {
        // Set slider for svg size
        var d = this.d3object.datum();
        d3.select("#svgscale")
            .property("min", d.scale_min)
            .property("max", d.scale_max)
            .property("value", d.scale)
            .on("change", () => { View.set_svgscale(this) });
    }

    set_current() {
        svg = d3.select(`#${this.id}`);
        this.link_svgscale();
    }

    actions() {

        /*
            Click events on the SVG.
         */
    
        this.d3object
            .on("contextmenu", d3.contextMenu(svgOptions))
            .on("mousedown", svg_mousedown)
            .on("click", (event) => { d3.select("#hrect").remove(); })
            .on("dblclick", (event) => {
                event.stopPropagation();
                // Just in case
                d3.select("#hrect").remove();
                unselect_all();
                // Get mouse position
                var mouse = d3.pointer(event);
                if (event.shiftKey && event.ctrlKey) {
                    // Create value on ctrl+shift+doubleclick
                    //draw_value(mouse[0],mouse[1]);
                    new Value({x: mouse[0], y: mouse[1]})
                } else if (event.shiftKey) {
                    // Create rolebox on shift+doubleclick
                    //draw_fact(mouse[0],mouse[1]);
                    new Predicate({x: mouse[0], y: mouse[1]})
                } else {
                    // Create entity on doubleclick
                    //draw_entity(mouse[0],mouse[1]);
                    new Entity({x: mouse[0], y: mouse[1]})
                }
            });
        
        // Popup actions
        d3.select("body")
            .on("keypress", (event) => {
                if(event.keyCode === 13 && open_popups.length > 0) {
                    enter_last_popup();
                }
            })
    }


}
