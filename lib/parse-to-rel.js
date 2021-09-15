/* Convert to Rel. This is a draft. The structure will likely
   change after roleboxes are added.
 */

var orm;
var reltypes;
var facts = {};
var statements;
var includedIDs;
var highlightNoParse = false;

function parse_orm() {
    // Parse SVG ORM to statements

    // All ID's included in parse to facts
    includedIDs = [];

    // Facts

    // Get fact subjects (These are entities right now)
    get_subjects();
    // Get the supported fact type
    get_relation_types();
    // Get final objects
    get_objects();
    // Convert to rel statements
    facts_to_rel();
    /*console.log("facts")
    console.log(facts)
    console.log("statements")
    console.log(statements);*/
    highlight_notparsed();

    d3.select("#rel").html("<pre>" + statements.join("\n") + "</pre>");

}

/* Parse SVG ORM to Facts */

function get_subjects() {
    // All entities that have relationships that lead
    // from the entity.
    var rel;
    var anyID;
    var k = 0; // Count facts
    for ( var relID in orm.relationships ) {
        rel = orm.relationships[relID];
        anyID = rel.datum().from;
        //console.log("checking relationships: " + anyID + " --> "  + relID)
        if ( is_entityID(anyID) ) {
            // From object is an entity
            facts[k] = {
                subject: orm.entities[anyID],
                hook: rel
            };
            includedIDs.push(anyID);
            includedIDs.push(relID);
            k += 1;
            //console.log(facts)
        }
    }
}

function get_relation_types() {
    // Determine which of the supported fact types the 
    // statement belongs to.
    //console.log("get_kinds")
    for ( var k in facts ) {
        //console.log("checking type for fact: " + facts[k].hook.datum().reltype)
        // Subtype
        if ( facts[k].hook.datum().reltype == reltypes.subtype ) {
            facts[k].reltype = reltypes.subtype;
            facts[k].relation = "is_subtype_of";
            facts[k].relwords = "is a subtype of";
            facts[k].lasthook = facts[k].hook;
        }
    }
}

function get_objects() {
    // Get the objects of the fact predicate.
    var anyID;
    for ( var k in facts ) {
        anyID = facts[k].lasthook.datum().to;
        facts[k].object = get_any_object(anyID);
        includedIDs.push(anyID);
    }
}

/* Facts to Rel */

function facts_to_rel() {
    statements = [];
    for ( var k in facts ) {
        if ( facts[k].reltype == reltypes.subtype ) {
            subtype_fact_to_rel(facts[k]);
        }
    }
}

function subtype_fact_to_rel(fact) {
    var subject = fact.subject.datum().name;
    var object = fact.object.datum().name;
    var relsubject = name_to_relname(subject);
    var relobject = name_to_relname(object);
    statements.push("// " + subject + " " + fact.relwords + " " + object + "\n");
    statements.push("ic " + fact.relation + "(v) = \n" +
                    "    " + relsubject + "(v) implies " +
                    relobject + "(v)\n")
}

function name_to_relname(name) {
    var relname = name.split(" ").join("_")
                      .replace("-","_")
                      .replace(":","");
    return relname;
}

function highlight_notparsed() {
    var class_string;
    for ( var entityID in orm.entities ) {
        var class_string = d3.select("#"+entityID).attr("class");
        d3.select("#"+entityID).attr( "class", class_string.replace(" notparsed", "") );
        if ( ! includedIDs.includes(entityID) && highlightNoParse ) {
            var class_string = d3.select("#"+entityID).attr("class");
            d3.select("#"+entityID).attr("class", class_string + " notparsed");
        }
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