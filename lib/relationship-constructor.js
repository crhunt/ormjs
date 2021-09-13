/*
    Everything related to relationships
*/

var svg;
var entities;

var relationships = {},
    highestRelID = 0;

function generate_relID() {
    relID = "id-rel-" + highestRelID.toString();
    highestRelID += 1;
    return relID
}

function relationships_prototype(defs) {
    
    // Line type connection
    var gline = defs.append("g")
        .attr("id","rel_line_prototype")
        .attr("class","rel_line_prototype");
    
    gline.append("path")
         .attr("class","rel_line")
         .attr("d", d3.line()([ [0,0], [1,1] ]));
}

function draw_rel_line(x1, y1, x2, y2) {

    // Create relationship id
    var relID = generate_relID();

    function remove_relationship(event) {
        if (event.defaultPrevented) return; // Drag
        if (event.ctrlKey) {
            var rel = d3.select(this);
            // Remove the relationship from records
            delete relationships[ rel.attr("id") ];
            remove_from_objects(rel)
            // Remove the relationship visualization
            rel.remove();
        }
    }

    var drag = d3.drag()
        .on("start", rdragstarted)
        .on("drag", rdragged)
        .on("end",rdragended);
    
    // Draw the line
    line = svg.append("path")
              .datum( { x1: x1, y1: y1, x2: x2, y2: y2, 
                        kind: "relation", selected: false,
                        from: "", to: "" } )
              //.attr("href","#rel_line_prototype")
              .attr("class","rel_line")
              .attr("id",relID)
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]))
              .on("click", remove_relationship);
              //.call(drag);

    return line;
}

function rdragstarted(event) { 
    event.sourceEvent.stopPropagation(); 
    d3.select(this).datum().selected = true;
}

function rdragged(event,d) {
    d.x2 = event.x;
    d.y2 = event.y;

    d3.select(this).attr("d", d3.line()([ [d.x1, d.y1], [d.x2, d.y2] ]));
}

function rdragended() {
    d3.select(this).datum().selected = false;
}

function dragged_by_object(rel) {
    // Relation is being dragged by a connecting object. Update position accordingly.
    
    // Get overlay position of entity that's closest to the other object
    // connected to the relation.
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    // Get starting and ending positions from connected object location
    var from_pos = closest_overlay(to_obj.datum(), from_obj.attr("id"));
    var to_pos = closest_overlay(from_obj.datum(), to_obj.attr("id"));
    // Move the relation
    dr.x1 = from_pos.x;
    dr.y1 = from_pos.y;
    dr.x2 = to_pos.x;
    dr.y2 = to_pos.y;
    rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]));
}

function connect_to_objects(rel) {
    // Add to datum of objects connected to relationship
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    from_obj.datum().relationships.push(rel.attr("id"));
    to_obj.datum().relationships.push(rel.attr("id"));
}

function remove_from_objects(rel) {
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    delete from_obj.datum().relationships[ rel.attr("id") ];
    delete to_obj.datum().relationships[ rel.attr("id") ];
}