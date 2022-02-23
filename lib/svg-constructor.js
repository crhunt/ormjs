/*
    Constructing the svg
*/

/*----- Global definitions -----*/

var orm; // Defined in parse-svg
var svg; // Defined here

class View {
    d3object;
    id;
    param = {
        svgscale: parse_number( get_css_variable('--svg-scale') ),
        svgscalemin: parse_number( get_css_variable('--svg-scale-min') ),
        svgscalemax: parse_number( get_css_variable('--svg-scale-max') ),
    };

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
        this.param.inv_scale = this.param.svgscalemax + this.param.svgscalemin - this.param.svgscale;
    }

    static generateID() {
        // Generate ID for a new constraint
        var svgID = "canvas-svg-" + orm.highestViewID.toString();
        orm.highestViewID += 1;
        return svgID
    }

    create_d3object(data) {
        
        //Create SVG element
        var newsvg = d3.select("#canvas")
            .append("svg")
                .datum( {} )
                .attr("id", this.id)
                .attr("class", "svg_prototype")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                .attr("viewBox", () => View.set_viewbox(this.param.svgscale))
                .attr("scaleValue", this.param.inv_scale)
                .attr("shape-rendering", "geometricPrecision");

        this.d3object = newsvg;
        // Record object
        this.record();
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
        // Pull the intial scale and the range from the css variables
        svgobj.param.svgscale = parse_number( d3.select("#svgscale").property("value") );
        svgobj.param.svgscalemin = parse_number( d3.select("#svgscale").property("min") );
        svgobj.param.svgscalemax = parse_number( d3.select("#svgscale").property("max") );
        // Invert the scale so slider is more intuitive (slide right to zoom in)
        svgobj.param.inv_scale = svgobj.param.svgscalemax + svgobj.param.svgscalemin - svgobj.param.svgscale;
        // Set viewBox
        svgobj.d3object
            .attr("viewBox", () => View.set_viewbox(svgobj.param.inv_scale))
            .attr("scaleValue", svgobj.param.inv_scale);
    }

    link_svgscale() {
        // Set slider for svg size
        d3.select("#svgscale")
            .property("min", this.param.svgscalemin)
            .property("max", this.param.svgscalemax)
            .property("value", this.param.svgscale)
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
                    draw_value(mouse[0],mouse[1]);
                } else if (event.shiftKey) {
                    // Create rolebox on shift+doubleclick
                    draw_fact(mouse[0],mouse[1]);
                } else {
                    // Create entity on doubleclick
                    draw_entity(mouse[0],mouse[1]);
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

/*
function svg_actions(mysvg) {

    //  Click events on the SVG.

    mysvg
        .on("contextmenu", d3.contextMenu(svgOptions))
        .on("mousedown", svg_mousedown)
        .on("click", (event) => { 
            d3.select("#hrect").remove();
            //unselect_all();
         })
        .on("dblclick", (event) => {
            event.stopPropagation();
            // Just in case
            d3.select("#hrect").remove();
            unselect_all();
            // Get mouse position
            var mouse = d3.pointer(event);
            if (event.shiftKey && event.ctrlKey) {
                // Create value on ctrl+shift+doubleclick
                draw_value(mouse[0],mouse[1]);
            } else if (event.shiftKey) {
                // Create rolebox on shift+doubleclick
                draw_fact(mouse[0],mouse[1]);
            } else {
                // Create entity on doubleclick
                draw_entity(mouse[0],mouse[1]);
            }
        });
}

function set_viewbox(svgscale) {
    // Rescale SVG using viewBox attribute.
    // Set the string for the rescale.
    return "-" + svgscale/2 + ", -" + svgscale/2 +
           ", " + svgscale + ", " + svgscale;
}

function set_svgscale() {
    // Set the viewBox attribute based on value of #svgscale attribute.
    // Pull the intial scale and the range from the css variables
    var svgscale = parse_number( d3.select("#svgscale").property("value") );
    var svgscalemin = parse_number( d3.select("#svgscale").property("min") );
    var svgscalemax = parse_number( d3.select("#svgscale").property("max") );
    // Invert the scale so slider is more intuitive (slide right to zoom in)
    var inv_scale = svgscalemax + svgscalemin - svgscale;
    // Set viewBox
    svg
        .attr("viewBox", () => set_viewbox(inv_scale))
        .attr("scaleValue", inv_scale);
}*/
