/* Convert to Rel. This is a draft. The structure will likely
   change after roleboxes are added.
 */

var orm;
var conntypes;
var facts = {};
var statements = [];
var includedIDs = [];
var highlightNoParse = false;

var facttypes = {
    subtype: "subtype",
    unary: "unary",
    binary: "binary",
    ternary: "ternary",
    nary: "nary"
}

function parse_orm() {
    // Parse SVG ORM to statements

    // All ID's included in parse to facts
    includedIDs = [];
    statements = [];
    facts = {};

    // Facts

    // Get fact subjects (These are entities right now)
    get_subjects();
    // Get the supported fact type
    get_connector_types();
    // Convert to rel statements
    facts_to_rel();
    // Highlight if not parsed
    ids_in_facts();
    highlight_notparsed();

    d3.select("#rel").html("<pre>" + statements.join("\n") + "</pre>");

}

/* Parse SVG ORM to Facts */

function get_subjects() {
    // All entities that have connectors that lead
    // from the entity.
    var conn;
    var anyID;
    facts = {};
    var k = 0; // Count facts
    for ( var connID in orm.connectors ) {
        conn = orm.connectors[connID];
        anyID = conn.datum().from;
        if ( is_entityID(anyID) ) {
            // From object is an entity
            facts[k] = {
                subject: orm.entities[anyID],
                hook: conn,
                idlist: [connID, anyID]
            };
            k += 1;
        }
    }
}

function get_connector_types() {
    // Determine which of the supported fact types the 
    // statement belongs to.
    const num_facts = Object.keys(facts).length;
    for ( var k of Array(num_facts).keys() ) {
        var conntype_k = facts[k].hook.datum().conntype;
        // Subtype
        if ( conntype_k == conntypes.subtype ) {
            parse_subtype_fact(k);
        } else if ( conntype_k == conntypes.EtoRB ) {
            parse_rolebox_fact(k);
        }
    }
}

function parse_subtype_fact(k) {
    facts[k].facttype = facttypes.subtype;
    facts[k].connector = "is_subtype_of";
    facts[k].connwords = "is a subtype of";
    facts[k].roleboxes = [];
    facts[k].keylist = [];
    facts[k].lasthook = facts[k].hook;
    var anyID = facts[k].hook.datum().to;
    facts[k].object = get_any_object(anyID);
    facts[k].idlist.push(anyID);
}

function parse_rolebox_fact(k) {
    /* Convert roleboxes to all combinations of facts */

    // Get roleboxes from hook to end
    var rboxID = facts[k].hook.datum().to;
    facts[k].idlist.push(rboxID);
    var rbgroup = orm.rbgroups[ orm.roleboxes[rboxID].attr("parent") ];
    facts[k].idlist.push(rbgroup.attr("id"));
    var boxes = [...rbgroup.datum().boxes];
    if (rbgroup.datum().flipped) { boxes = boxes.reverse(); }
    var index = boxes.indexOf(rboxID);
    boxes = boxes.slice(index,boxes.length);
    facts[k].idlist.push.apply(facts[k].idlist, boxes);

    // Get all rolebox names
    var namelist = rolebox_names(boxes);

    // Get all rolebox entities
    var predicate = rolebox_entities(boxes);
    if (predicate == null) {
        delete facts[k];
        return
    }
    facts[k].idlist.push.apply(facts[k].idlist, predicate.idlist);
    
    // Assign facts
    facts[k].keylist = predicate.keylist;
    facts[k].roleboxes = boxes;
    facts[k].facttype = facttypes.nary;
    facts[k].connector = name_to_relname( namelist.join("_").replaceAll(" ","") );
    facts[k].connwords = namelist;
    facts[k].object = predicate.object;
    if ( predicate.keylist.length == 0 ) {
        facts[k].facttype = facttypes.unary;
    }

}

function rolebox_names(boxes) {
    var namelist = []
    for (var n in boxes) {
        namelist.push( orm.roleboxes[boxes[n]].datum().name );
    }
    return namelist;
}

function rolebox_entities(boxes) {
    var entitylist = [];
    var idlist = [];
    var eobject = null;
    for (var n in boxes) {
        var entityID = orm.roleboxes[boxes[n]].datum().entity;
        if (entityID == null) { return null }
        idlist.push(entityID);
        if (n == boxes.length-1) { eobject = d3.select("#"+entityID); }
        else { entitylist.push( d3.select("#"+entityID) ); }
        
        // Get connector between entity and rolebox to add to idlist
        var rb_connectors = orm.roleboxes[ boxes[n] ].datum().connectors;
        var e_connectors = orm.entities[ entityID ].datum().connectors;
        var overlap = rb_connectors.filter(value => e_connectors.includes(value));
        idlist.push.apply(idlist, overlap);
    }

    return { keylist: entitylist, object: eobject, idlist: idlist }
}

/* Facts to Rel */

function facts_to_rel() {
    statements = [];
    for ( var k in facts ) {
        if ( facts[k].facttype == facttypes.subtype ) {
            subtype_fact_to_rel(facts[k]);
        } else if ( facts[k].facttype == facttypes.nary ) {
            nary_fact_to_rel(facts[k]);
        }
    }
}

function subtype_fact_to_rel(fact) {
    var subject = fact.subject.datum().name;
    var object = fact.object.datum().name;
    var relsubject = name_to_relname(subject);
    var relobject = name_to_relname(object);
    var atom = "id";
    fact.description = subject + " " + fact.connwords + " " + object;
    statements.push("// " + fact.description + "\n");
    statements.push("ic " + fact.connector + "("+atom+") = \n" +
                    "    " + relsubject + "("+atom+") implies " +
                    relobject + "("+atom+")\n")
}

function unary_fact_to_rel(fact) {
    // NOT DONE
}

function nary_fact_to_rel(fact) {
    // Get the name of the value of the connector
    var object = fact.object.datum().name;
    var relobject = name_to_relname(object);
    var objbox = fact.connwords[fact.connwords.length-1];
    // Get the names of the keys of the connector
    var keylist = [];
    for (var n in fact.keylist) {
        var keyname = { atom: "id"+n.toString(),
                        relname: name_to_relname(fact.keylist[n].datum().name),
                        name: fact.keylist[n].datum().name,
                        boxname: fact.connwords[n] };
        keylist.push(keyname);
    }
    fact.description = keylist[0].name + " " + keylist[0].boxname
    var keyslice = keylist.slice(1,keylist.length);
    for ( n in keyslice ) {
        fact.description += " " + keyslice[n].boxname + " " + keyslice[n].name;
    }
    fact.description += " " + objbox + " " + object;
    statements.push("// " + fact.description + "\n");

    var objatom = "id";
    var def_statement = "def "+fact.connector+"("
    var def_body = "    "+relobject+"("+objatom+")"
    for (n in keylist) {
        def_statement += keylist[n].atom+", ";
        def_body += " and\n    " + keylist[n].relname + "(" + keylist[n].atom + ")"
    }
    def_statement += objatom + ") =\n"+def_body+"\n";
    statements.push(def_statement);
}

function name_to_relname(name) {
    var relname = name.split(" ").join("_")
                      .replaceAll("-","_")
                      .replaceAll(":","");
    return relname;
}

/* Highlighting unparsed ORM */

function ids_in_facts() {
    includedIDs = [];
    for( var k in facts ) {
        includedIDs.push.apply( includedIDs, facts[k].idlist );
    }
}

function highlight_notparsed() {
    var class_string;
    // Find all entities that are not parsed
    for ( var entityID in orm.entities ) {
        add_notparsed_class(entityID);
    }
    // Find all connectors that are not parsed
    for ( var connID in orm.connectors ) {
        add_notparsed_class(connID);
    }
    // Find roleboxes that are not parsed
    for ( var boxID in orm.roleboxes ) {
        add_notparsed_class(boxID);
    }
}

function add_notparsed_class(anyID) {
    var class_string = d3.select("#"+anyID).attr("class");
    d3.select("#"+anyID).attr( "class", class_string.replace(" notparsed", "") );
    if ( ! includedIDs.includes(anyID) && highlightNoParse ) {
        var class_string = d3.select("#"+anyID).attr("class");
        d3.select("#"+anyID).attr("class", class_string + " notparsed");
    }
}

function set_highlighter() {
    if(d3.select("#highlightNoParse").property("checked")){
        highlightNoParse = true;
    } else {
        highlightNoParse = false;
    }
    highlight_notparsed();
}