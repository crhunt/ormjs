// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent;

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["constraint"] = parse_number( get_css_variable('--constraint-radius') );
tolerance.snap["constraint"] = parse_number( get_css_variable('--constraint-radius') );

class Constraint {

    d3object;
    id;
    param = {
        radius : parse_number( get_css_variable('--constraint-radius') ),
        snapTolerance : parse_number( get_css_variable('--constraint-radius') )
    };

    constructor(x,y) {
        
        this.id = Constraint.generateID();
        
        var constraint = svg.append("g")
            .datum( { x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                      selected: false,
                      kind: "constraint", type: "inclusive-or",
                      from: "", to: "",  deontic: false,
                      from_loc: dragevent.locations,
                      to_loc: dragevent.locations } )
            .attr("class", "constraint_prototype")
            .attr("id", this.id)
            .attr("parent", this.id)
            .attr("x", x)
            .attr("y", y)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);
        
        constraint.append("circle")
            .attr("class", "constraint")
            .attr("id","c-"+this.id)
            .attr("x", x)
            .attr("y", y)
            .attr("r", this.param.radius)
            .attr("transform", () => translate(-this.param.radius,-this.param.radius));
        
        this.d3object = constraint;

        // Add actions
        this.actions();
    }

    static generateID() {
        var constID = "id-constraint-" + orm.highestConstID.toString();
        orm.highestConstID += 1;
        return constID
    }

    /* Actions */

    actions() {
        var drag_constraint = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", (event, d) => { this.dragged(event, d, this); } )
            .on("end",  this.dragended);
        
        this.d3object
            .call(drag_constraint);
    }

    dragstarted(event) {
        event.sourceEvent.stopPropagation();
        d3.select(this).datum().selected = true;
        d3.select(this).style("cursor", "grabbing");
    }

    dragged(event, d, constraint) {

        if (constraint.d3object.classed("selected")) {
            drag_selected(event);
        } else {
            
            // Set the new position
            d.dx += event.dx;
            d.dy += event.dy;
    
            // Snap to entities
            d.dx = snap( d.dx + d.x0, "x", constraint.id ) - d.x0;
            d.dy = snap( d.dy + d.y0, "y", constraint.id ) - d.y0;
            d.x = d.x0 + d.dx;
            d.y = d.y0 + d.dy;
    
            // Drag constraint
            constraint.move();
        }
    }

    dragended() {
        d3.select(this).datum().selected = false;
        d3.select(this).style("cursor", "grab");
    }

    move() {
        var d = this.d3object.datum();
        this.d3object
            .attr("x", d.x)
            .attr("y", d.y )
            .attr("transform", () => translate(d.dx,d.dy));
    }

}