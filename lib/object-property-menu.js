/* Menu for defining properties of objects */

var svg

var popwidth = parse_number( get_css_variable('--pop-width') );
var popheight = parse_number( get_css_variable('--pop-height') );

var open_popups = [];

// The updateable fields for each object type
var formfields = { "entity": ["name","refmode"],
                   "rolebox": ["name"],
                   "rolebox_group": ["rname"] };

/* Draw menu */

function draw_popup(object) {

    // If the object kind isn't a key in popfun, don't generate popup
    //var pop = { "entity": "lib/forms/entity-properties.html" }
    var popfun = { "entity": function() { return entity_form(object) },
                   "rolebox_group": function() { return role_form(object) } };
    if ( ! (object.datum().kind in popfun) ) { return }

    // Only generate one popup per object
    if ( ! d3.select("#pop-"+object.attr("id")).empty() ) { return }

    d3.select("#entity_id")
        .html( `${object.attr("id")}` );

    // Append object
    var popup = svg.append("g")
        .datum( {x: -popwidth/2, y: -popheight/2} )
        .attr("class","popup_group")
        .attr("id", "pop-"+object.attr("id"))
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", popwidth)
        .attr("height", popheight)
        .attr("transform", translate(-popwidth/2, -popheight/2));
    popup.append("rect")
        .attr("class","popup")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", popwidth)
        .attr("height", popheight);

    // Append form
    popup.append("foreignObject")
        .attr("class","popup")
        .attr("width", popwidth)
        .attr("height", popheight)
        .append("xhtml:div")
            .attr("class","popup_content")
            .html(() => { return popfun[ object.datum().kind ]() });

    // Uniqueness constraints
    if (object.datum().kind == "rolebox_group") {
        popup_rbgroup(object);
    }
    // Append Submit svg
    append_submit(popup, object);

    // Append X for closing without saving
    append_close(popup, object);

    // Make popup draggable
    var drag_popup = d3.drag()
        .on("start", pdragstarted)
        .on("drag", pdragged)
        .on("end", pdragended);

    // Drag popup
    popup
        .on("dblclick", (event) => { event.stopPropagation(); })
        .on("contextmenu", (event) => { event.stopPropagation(); })
        .call(drag_popup);

    // Stop drag on form fields
    no_drag_fields(object);

    // Add to list
    open_popups.push(popup);

}

function append_close(popup,object) {
    var xsize = parse_number( get_css_variable('--pop-close-sz') );
    var xmarg = 1.2*xsize;
    var xpos = {x:popwidth-xmarg, y:xmarg};
    popup
        .append("path")
        .attr("d", () => { return xPath(xpos,xsize) } )
        .attr("class","xclose")
        .attr("id", "xpop-"+object.attr("id"));
    d3.select("#xpop-"+object.attr("id"))
        .on("click", close_popup);
}

function append_submit(popup, object) {

    // Append Submit sv

    // Dimensions
    var stroke_sz = parse_number( get_css_variable('--pop-stroke') );
    var stroke_sz_h = parse_number( get_css_variable('--pop-stroke-hover') )
    var chsize = { x: parse_number( get_css_variable('--pop-ch-width') ), 
                   y: parse_number( get_css_variable('--pop-ch-height') ),
                   m: parse_number( get_css_variable('--pop-ch-marg') ) };
    var xmarg = parse_number( get_css_variable('--pop-close-sz') );
    var chmarg = {x: chsize.x/2 - chsize.m, y: chsize.m, ex:2*xmarg, ey:xmarg};
    var chpos = {x: popwidth - chmarg.ex - chsize.x,
                 y: popheight - chmarg.ey - chsize.y };
    // Draw the check
    popup
        .append("g")
            .attr("id", "submit-"+object.attr("id"))
            .attr("x", popwidth - chmarg.ex)
            .attr("y", popheight - chmarg.ey);
    d3.select("#submit-"+object.attr("id"))
        .append("rect")
            .attr("id", "#submit-r-"+object.attr("id"))
            .attr("class", "submit_svg")
            .attr("x", chpos.x)
            .attr("y", chpos.y)
            .attr("width", chsize.x+2*chmarg.x)
            .attr("height", chsize.y+2*chmarg.y);
    d3.select("#submit-"+object.attr("id"))
        .append("path")
            .attr("d", () => { return checkPath(chpos,chsize,chmarg) } )
            .attr("class","spath")
            .attr("id", "spop-"+object.attr("id"))
            .attr("stroke-width", stroke_sz);
    d3.select("#submit-"+object.attr("id"))
        .on("mouseover", () => { 
            d3.select("#spop-"+object.attr("id"))
                .attr("stroke-width", stroke_sz_h)
                .attr("stroke-opacity", 1.0);
        })
        .on("mouseout", () => { 
            d3.select("#spop-"+object.attr("id"))
                .attr("stroke-width", stroke_sz)
                .attr("stroke-opacity", 0.6);
        })
        .on("click", () => update_object(object));
}

function xPath(position, size) {

    // Draw the plus sign overlay for adding new roleboxes
    var hsize = size/2;
    return [
        "M", position.x-hsize, ",", position.y+hsize,
        "L", position.x+hsize, ",", position.y-hsize,
        "M", position.x-hsize, ",", position.y-hsize,
        "L", position.x+hsize, ",", position.y+hsize,
        "Z"
    ].join("");
}

function checkPath(position, size, margin) {

    // Draw the plus sign overlay for adding new roleboxes
    return [
        "M", position.x+size.x+margin.x, ",", position.y+margin.y,
        "L", position.x+(size.x+margin.x)/2, ",", size.y+position.y+margin.y/2,
        "L", position.x+margin.x, ",", position.y+(size.y+margin.y)/1.7,
        "M", position.x+size.x, ",", position.y+margin.y,
        "Z"
    ].join("");
}

/* Menu actions */

function popup_event(event,d) {

    event.stopPropagation();

    // Get the parent object
    //var click_objID = d3.select("this").attr("id");
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var click_objID = event.target.id.toString();//.substring(0,event.target.length);
    var objID = get_rbgroupID(click_objID);
    // Create popup
    draw_popup( d3.select("#"+objID) );

}

function pdragstarted(event) {
    event.sourceEvent.stopPropagation();
}

function pdragged(event,d) {

    d.x += event.dx;
    d.y += event.dy;

    d3.select(this)
        .attr("transform", translate(d.x, d.y));
}

function pdragended() {
    return
}

function close_popup(event,d) {

    var xID = d3.select(this).attr("id");
    var popID = xID.substring(1,xID.length);
    remove_popup( d3.select("#"+popID) );
}

function remove_popup(popup) {

    d = popup.datum();
    var x = d.x + popwidth/2;
    var y = d.y + popheight/2;

    popup
        .transition()
        .duration(600)
        .attr("transform", "translate(" + x + "," + y + ") scale(0)")
        .remove();
}

function remove_all_popups(_callback) {
    // Get all popup groups
    var popup_groups = d3.select("svg").selectAll(".popup_group");
    for ( k in popup_groups.nodes() ) { 
        // Add entity to entities list
        var popID = popup_groups.nodes()[k].id;
        d3.select("#"+popID).remove();
    }
    _callback();
}

function no_drag_fields(object) {
    
    // Stop drag on form fields

    var drag_form = d3.drag()
        .on("start", (event) => { event.sourceEvent.stopPropagation(); });
    
    // Fields that belong to the parent object
    var formIDs = formfields[object.datum().kind];
    for (var n in formIDs ) {
        d3.select("#"+formIDs[n]+"-"+object.attr("id"))
            .call(drag_form);
    }
    // Rolebox name fields
    if ( object.datum().kind == "rolebox_group" ){
        var boxes = [...object.datum().boxes];
        delete boxes[1]; // One name field for the first 2 boxes cuz orm is difficult like that
        for (var n in boxes) {
            d3.select("#name-"+boxes[n]).call(drag_form);
        }
    }
}

function enter_last_popup() {
    var popup = open_popups[open_popups.length-1];
    var objID = popup.attr("id").substring(4,popup.attr("id").length);
    var object = d3.select("#"+objID);
    update_object(object);
    remove_from_array(open_popups, popup);
}

/* Updates */

function update_object(object) {
    
    // Use the data submitted on the form to update the object datum.
    var formIDs = formfields[object.datum().kind];
    update_fields(object,formIDs)

    // Update individual rolebox attributes
    if (object.datum().kind == "rolebox_group") {
        update_rolebox_fields(object);
        set_rbgroup_uconstraints(object);
    }

    // Update names
    update_name(object);

    // Update rel
    parse_orm();

    // Remove popup
    remove_popup( d3.select("#pop-"+object.attr("id")) );
}

function update_fields(object,formIDs) {
    // Update the datum of object with the names in formIDs
    var d = object.datum();
    for (var n in formIDs ) {
        var fieldval = d3.select(`#${formIDs[n]}-${object.attr("id")}`).property("value");
        if(fieldval.length > 0) {
            d[ formIDs[n] ] = fieldval;
        }
    }
}

function update_rolebox_fields(object) {

    var formIDs = formfields["rolebox"];
    var boxes = [...object.datum().boxes];
    if (object.datum().flipped) { boxes.reverse(); }
    if (boxes.length > 1) {
        // Split words in first 2 boxes
        var fieldval = d3.select(`#name-${boxes[0]}`).property("value");
        var role_names = split_role_name(fieldval);
        d3.select("#"+boxes[0]).datum().name = role_names[0];
        d3.select("#"+boxes[1]).datum().name = role_names[1];
    }
    // Assign rest of boxes
    if (boxes.length > 2) {
        var rng = range(boxes.length-2, startAt=2);
        for ( var n in rng ) {
            update_fields( d3.select("#"+boxes[rng[n]]) ,formIDs );
        }
    }
}

function set_rbgroup_uconstraints(rbgroup) {
    // Set the uniqueness constraints based on the popup values
    rbg = d3.select("#pop-rbg-"+rbgroup.attr("id"));
    var popboxes = rbg.datum().boxes;
    var boxes = [...rbgroup.datum().boxes];
    if ( rbgroup.datum().flipped ){ boxes.reverse() }
    for (var n in boxes) {
        var rbox = d3.select("#"+boxes[n]);
        rbox.datum().multiplicity = d3.select("#"+popboxes[n]).datum().multiplicity;
        set_rb_uniqueness_constraint(rbox);
    }
    rbg.remove();
}

function split_role_name(namestring) {
    var names = namestring.split(" ")
    if (names.length == 1) { return [namestring, ""] }
    if (names.length == 2) { return names }
    var name1 = names.splice(0,names.length-1).join(" ")
    var name2 = names[names.length-1]
    return [name1, name2]
}

function update_name(object) {
    if (object.datum().kind == "entity") {
        update_entity_name(object);
    }
    if (object.datum().kind == "rolebox_group") {
        set_rolebox_display_name(object);
    }
}

/* Forms */

function entity_form(entity) {
    var d = entity.datum();
    var entityID = entity.attr("id");
    return `
    <div class="popup_form">
    <h1>Entity</h1>
        <table class="form_table">
        <tr>
        <td class="left_col"><label for="fname">Name</label></td>
        <td class="right_col"><input type="text" id="name-${entityID}" name="name" value="${d.name}" /></td>
        </tr>
        <tr>
        <td class="left_col"><label for="lname">Ref. mode</label></td>
        <td class="right_col"><input type="text" id="refmode-${entityID}" name="refmode" value="${d.refmode}" /></td>
        </tr>
        </table>
    </div>
    `
}

function role_form(rbgroup) {
    var gd = rbgroup.datum();
    var boxes = [...gd.boxes];
    if (gd.flipped) { boxes.reverse(); }
    var d = d3.select("#"+boxes[0]).datum();
    var rname = d.name;
    if (boxes.length > 1) {
        d = d3.select("#"+boxes[1]).datum();
        rname += " " + d.name;
    }
    // Set the form for the first 2 boxes
    var form_html = `
    <div class="popup_form">
    <h1>Role</h1>
        <table class="form_table">
        <tr>
        <td class="left_col"><label for="fname">Name</label></td>
        <td class="right_col"><input type="text" id="name-${boxes[0]}" name="name" value="${rname}" /></td>
        </tr>`;
    // Set the form for additional boxes
    if (boxes.length > 2) {
        var rng = range(boxes.length-2, startAt=2);
        for ( var n in rng ) {
            d = d3.select("#"+boxes[ rng[n] ]).datum();
            form_html += 
            `<tr>
            <td class="left_col"><label for="lname">...</label></td>
            <td class="right_col"><input type="text" id="name-${boxes[ rng[n] ]}" name="name" value="${d.name}" /></td>
            </tr>`
        }
    }
    // Set the form for the reverse name
    form_html += `
        <tr>
        <td class="left_col"><label for="fname">Rev. Name</label></td>
        <td class="right_col"><input type="text" id="rname-${rbgroup.attr("id")}" name="${gd.rname}" value="${gd.rname}" /></td>
        </tr>`
    // Set the uniqueness constraints
    var svgwidth = (boxes.length+1)*rb_param.width;
    var svgheight = 2*rb_param.height;
    var svgid = "popsvg-"+rbgroup.attr("id");
    form_html +=`
        <tr>
        <td colspan="2"><label>Uniqueness Constraints</label></td>
        </tr>
        <tr>
        <td colspan="2" class="centered"><svg id="${svgid}" width="${svgwidth}" height="${svgheight}"></svg></td>
        </table>
    </div>
    `;

    return form_html
}

function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}

function popup_rbgroup(rbgroup) {
    /* 
      Create the rolebox group that appears in the rolebox menu. This
      is how uniqueness constraints are set.
     */
    var x = rb_param.width;
    var y = rb_param.height*1.2;
    var rbgID = "pop-rbg-"+rbgroup.attr("id");
    var rbg = d3.select("#popsvg-"+rbgroup.attr("id")).append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                 boxes: []} )
        .attr("class", "rolebox_group")
        .attr("id", rbgID)
        .attr("x", -rb_param.width/2 )
        .attr("y", -rb_param.height/2 );
    var boxes = [...rbgroup.datum().boxes];
    if ( rbgroup.datum().flipped ){ boxes.reverse() }
    console.log(rbg.attr("id"))
    for (var n in boxes) {
        // Create box
        var rbox = draw_box(rbg);
        // Set initial uniqueness constraint to match rbgroup
        rbox.datum().multiplicity = d3.select("#"+boxes[n]).datum().multiplicity;
        rbox.datum().uclist = available_uconstraints(n, boxes.length);
        set_rb_uniqueness_constraint(rbox);
        rbox.on("click", rotate_uconstraint)
    }
}

function rotate_uconstraint(event,d) {

    var rbox = d3.select(this);
    var ind = d.uclist.indexOf(d.multiplicity);
    d.multiplicity = d.uclist[ (ind+1) % d.uclist.length ];
    console.log(d.multiplicity, d.uclist);
    set_rb_uniqueness_constraint(rbox);
    console.log(d.multiplicity, rbox.datum().multiplicity, rbox.datum().parent)
}

function available_uconstraints(n,total) {
    var av = []
    if (n < total-1 && total > 1) {
        n == 0 ? av = ["none","one","many"] : av = ["none","one","many","skip"]
    }
    if (n == total-1) {
        av = ["none","one"];
    }
    return av
}