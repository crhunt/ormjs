/* Menu for defining properties of objects */

var svg

/* Set the shape of the pop-up from the css stylesheet, popup-style.css */
var popwidth = parse_number( get_css_variable('--pop-width') );
var popheight = parse_number( get_css_variable('--pop-height') );

/* Keep track of open popups */
var open_popups = [];

/* The updateable fields for each object type.
   We iterate over these on update events. */
var formfields = { "entity": ["name","refmode"],
                   "value": ["name"],
                   "rolebox": ["name"],
                   "rolebox_group": ["rname"] };
/* Unless specified here, all fields need to have a value for 
   an update event to take place. */
var allowed_empty_fields = { "rolebox_group": ["rname"] }

/* Draw menu */

function draw_popup(object) {

    /* 
       Create a new popup for object.
     */

    // For each object, set the function that generates the form.
    var popfun = { "entity": function() { return entity_form(object) },
                   "rolebox_group": function() { return fact_form(object) },
                   "value": function() { return value_form(object) } };
    // If the object kind isn't a key in popfun, don't generate popup
    if ( ! (object.datum().kind in popfun) ) { return }

    // Only generate one popup per object
    if ( ! d3.select("#pop-"+object.attr("id")).empty() ) { return }

    /*d3.select("#entity_id")
        .html( `${object.attr("id")}` );*/

    // Append popup to svg
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

    // Uniqueness constraints for rolebox group form
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

    /* Add a close X button to top right corner of popup */

    // Size is set by CSS stylesheet popup-style.css
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

    /* Add a submit check button to bottom right corner of popup */

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
    // Add actions
    d3.select("#submit-"+object.attr("id"))
        // Highlight on mouseover
        .on("mouseover", () => { 
            d3.select("#spop-"+object.attr("id"))
                .attr("stroke-width", stroke_sz_h)
                .attr("stroke-opacity", 1.0);
        })
        // No highlight on mouse out
        .on("mouseout", () => { 
            d3.select("#spop-"+object.attr("id"))
                .attr("stroke-width", stroke_sz)
                .attr("stroke-opacity", 0.6);
        })
        // On click, update object
        .on("click", () => update_object(object));
}

function xPath(position, size) {

    // Draw the X for closing the popup form
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

    // Draw the check for submitting the popup form
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

    /* Object click event for creating a popup */

    event.stopPropagation(); // Don't go creating entities on double-click

    // Get the parent object
    //var click_objID = d3.select("this").attr("id");
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var click_objID = event.target.id.toString();//.substring(0,event.target.length);
    var objID = get_rbgroupID(click_objID);
    // Create popup
    draw_popup( d3.select("#"+objID) );

}

function pdragstarted(event) {
    // Drag the popup
    event.sourceEvent.stopPropagation();
}

function pdragged(event,d) {

    // Drag the popup

    d.x += event.dx;
    d.y += event.dy;

    d3.select(this)
        .attr("transform", translate(d.x, d.y));
}

function pdragended() {
    return
}

function close_popup(event,d) {

    /* On X click event */

    var xID = d3.select(this).attr("id");
    var popID = xID.substring(1,xID.length);
    remove_popup( d3.select("#"+popID) );
}

function remove_popup(popup) {

    /* Remove the popup visualization */

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
    
    /* Close all popup groups. This is done before saving svg. */
    
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
    
    /* Stop drag on form fields. 
       --> Don't want to drag the popup instead of highlighting text. */

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

    /* Hitting the enter key acts like submit on the most recent popup. */

    var popup = open_popups[open_popups.length-1];
    var objID = popup.attr("id").substring(4,popup.attr("id").length);
    var object = d3.select("#"+objID);
    update_object(object);
    open_popups = remove_from_array(open_popups, popup);
}

/* Updates */

function update_object(object) {

    /* Actions on popup form submit */
    
    // Use the data submitted on the form to update the object datum.
    update_fields(object)

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

function update_fields(object) {
    
    /* Update the datum of object, where names in formIDs 
       match datum attributes.
       
       Note we assume all values should be strings. */
    
    var formIDs = formfields[object.datum().kind];
    var allowedEmptyIDs = allowed_empty_fields[object.datum().kind];
    var d = object.datum();
    for (var n in formIDs ) {
        var fieldval = d3.select(`#${formIDs[n]}-${object.attr("id")}`).property("value");
        // Ensure field is not empty (unless allowed)
        if( fieldval.length > 0 || allowedEmptyIDs.includes(formIDs[n]) ) {
            // Set datum to field value
            d[ formIDs[n] ] = fieldval;
        }
    }
}

function update_rolebox_fields(object) {

    /* 
       The fact popup changes datum of individual roleboxes. 
       We handle that here.

       Setting rolebox names.
     */

    var formIDs = formfields["rolebox"];
    var boxes = [...object.datum().boxes];
    // Flip the boxes to "forward" order if reversed to match popup
    // box order.
    if (object.datum().flipped) { boxes.reverse(); }
    if (boxes.length == 1) {
        // Set rolebox name based on full value in field (no splitting)
        update_fields( d3.select("#"+boxes[0]) ,formIDs );
    }
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
    
    /* Set the fact uniqueness constraints based on the popup values */
    
    // UC's only on predicates of size > 1
    if ( rbgroup.datum().boxes.length == 1 ) { return }
    
    // Get the rolebox group shown in the popup
    rbg = d3.select("#pop-rbg-"+rbgroup.attr("id"));
    if (rbg.classed("notparsed")) { 
        // Don't set uniqueness constraints if the combination
        // isn't allowed by ORM.
        rbg.remove();
        return 
    }
    var popboxes = rbg.datum().boxes;
    var boxes = [...rbgroup.datum().boxes];
    if ( rbgroup.datum().flipped ){ boxes.reverse() }
    var rotate = false
    if ( rbgroup.datum().rotated ) {
        // Undo rotatation before adding uniqueness constraints
        rotate = true;
        rotate_rolebox_group(rbgroup);
    }
    for (var n in boxes) {
        var rbox = d3.select("#"+boxes[n]);
        rbox.datum().multiplicity = d3.select("#"+popboxes[n]).datum().multiplicity;
        set_rb_uniqueness_constraint(rbox);
    }
    if ( rotate ) {
        // re-rotate if rotated
        rotate_rolebox_group(rbgroup);
    }
    rbg.remove();
}

function split_role_name(namestring) {
    // Split the single string value entered for the 1st two roleboxes into names
    // for each rolebox.
    var names = namestring.split(" ")
    if (names.length == 1) { return [namestring, ""] }
    if (names.length == 2) { return names }
    var name1 = names.splice(0,names.length-1).join(" ")
    var name2 = names[names.length-1]
    return [name1, name2]
}

function update_name(object) {

    /* Using the object's datum, set the visualization of
       the name. */

    if (object.datum().kind == "entity") {
        update_entity_name(object);
    }
    if (object.datum().kind == "value") {
        update_value_name(object);
    }
    if (object.datum().kind == "rolebox_group") {
        set_rolebox_display_name(object);
    }
}

/* Forms */

function entity_form(entity) {

    /* Define the form for changing entity properties. */

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

function value_form(value) {

    /* Define the form for changing value properties. */

    var d = value.datum();
    var valueID = value.attr("id");
    return `
    <div class="popup_form">
    <h1>Value</h1>
        <table class="form_table">
        <tr>
        <td class="left_col"><label for="fname">Name</label></td>
        <td class="right_col"><input type="text" id="name-${valueID}" name="name" value="${d.name}" /></td>
        </tr>
        </table>
    </div>
    `
}

function fact_form(rbgroup) {

    /* Define the form for changing Fact properties. (ie, rolebox groups) */

    // Need to know how many roleboxes are in the group to display fields
    // for name change and uniqueness constraints.
    var gd = rbgroup.datum();
    var boxes = [...gd.boxes];
    // Display the boxes unflipped for clarity
    if (gd.flipped) { boxes.reverse(); }
    var d = d3.select("#"+boxes[0]).datum();
    var rname = d.name;
    // The first name box includes the names of the first two boxes.
    // Because ORM is like that...sigh.
    if (boxes.length > 1) {
        d = d3.select("#"+boxes[1]).datum();
        rname += " " + d.name;
    }
    // Set the form for the first 2 boxes
    var form_html = `
    <div class="popup_form">
    <h1>Fact</h1>
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
    // We define the SVG field here, but we populate it separately.
    if ( boxes.length > 1 ) {
        var svgwidth = (boxes.length+1)*rb_param.width;
        var svgheight = 2*rb_param.height;
        var svgid = "popsvg-"+rbgroup.attr("id");
        form_html +=`
            <tr>
            <td colspan="2"><label>Uniqueness Constraints</label></td>
            </tr>
            <tr>
            <td colspan="2" class="centered"><svg id="${svgid}" width="${svgwidth}" height="${svgheight}"></svg></td>
            </tr>
            `
    }
    form_html +=`
        </table>
    </div>
    `;

    return form_html
}

function popup_rbgroup(rbgroup) {
    /* 
      Create the rolebox group that appears in the rolebox menu. This
      is how uniqueness constraints are set.
     */
    var x = rb_param.width;
    var y = rb_param.height*1.2;
    var rbgID = "pop-rbg-"+rbgroup.attr("id");
    if ( d3.select("#popsvg-"+rbgroup.attr("id")).empty() ) { return }
    var rbg = d3.select("#popsvg-"+rbgroup.attr("id")).append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                 boxes: []} )
        .attr("class", "rolebox_group")
        .attr("id", rbgID)
        .attr("x", -rb_param.width/2 )
        .attr("y", -rb_param.height/2 );
    var boxes = [...rbgroup.datum().boxes];
    if ( rbgroup.datum().flipped ){ boxes.reverse() }
    for (var n in boxes) {
        // Create box
        var rbox = draw_box(rbg);
        // Set initial uniqueness constraint to match rbgroup
        rbox.datum().multiplicity = d3.select("#"+boxes[n]).datum().multiplicity;
        rbox.datum().uclist = available_uconstraints(n, boxes.length);
        set_rb_uniqueness_constraint(rbox);
        rbox.on("click", rotate_uconstraint)
    }
    allowed_uc_combination(rbg);
}

function rotate_uconstraint(event,d) {

    /* Select the next uniqueness constraint to display above the rolebox.
       Each rolebox has a list of uniqueness constraints that can be applied,
       Set by available_uconstraints. 
       
       This function selects the next in the list and displays it above the 
       rolebox in the property menu when the rolebox is clicked. */

    var rbox = d3.select(this);
    var ind = d.uclist.indexOf(d.multiplicity);
    d.multiplicity = d.uclist[ (ind+1) % d.uclist.length ];
    set_rb_uniqueness_constraint(rbox);
    allowed_uc_combination(d3.select("#"+rbox.datum().parent));
}

function available_uconstraints(n,total) {
    var av = []
    if (n < total-1 && total > 1) {
        n == 0 ? av = ["none","one","many"] : av = ["none","one","many","skip"]
    }
    if (n == total-1) {
        av = ["none","one","many"];
    }
    return av
}

function allowed_uc_combination(rbg) {
    /* 
       Check if the uniqueness constraint is allowed by ORM rules.
       If not, highlight in red by classing to "notparsed"
     */
    var rbgID = rbg.attr("id");
    // Check each rolebox for its multiplicity
    var boxes = [...rbg.datum().boxes];
    var uclist = [];
    for (var n in boxes) {
        uclist.push( d3.select("#"+boxes[n]).datum().multiplicity );
    }
    // Get the count of each multiplicity type
    var uccnt = { "none": 0, "one": 0, "many": 0, "skip": 0 };
    uccnt = uclist.reduce(
        function (acc, curr) {
            return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc
        }, uccnt);
    var total = boxes.length;
    // Here are the ORM rules
    // Integrity constraints must appear over total-1
    if ( ( uccnt["many"] > 0 && uccnt["many"] < total-1 ) ||
         ( uccnt["one"] > 0 && uccnt["one"] < total-1 ) ||
         ( uccnt["skip"] > 0 && uccnt["none"] > 0 ) ||
         ( uccnt["skip"] > 1 ) ||
         ( uccnt["many"] > 0 && uccnt["many"] != total && total == 2 ) ) {
        unclass_notparsed(rbgID);
        class_notparsed(rbgID);
        return
    }
    unclass_notparsed(rbgID);
}