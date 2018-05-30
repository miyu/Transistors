$ = $;

const g_hacksEnabled = true;
const g_speedUp = g_hacksEnabled ? 50 : 1;

const InitialState = {
    transistors: 0,
    transistorsBuilt: 0,
    computers: 0, 
    computersBuilt: 0, 
    factories: g_hacksEnabled ? 1 : 0,
    factoriesBuilt: 0,
    labs: 0,
    labsBuilt: 0,
    research: 0,
    researchBuilt: 0,

    integratedCircuits: 0,
    integratedCircuitsBuilt: 0,

    R_INTEGRATED_CIRCUITS: 0,
};

let OpType = {
    default: 0,
    research: 1,
}

let g_currentState = { ...InitialState };

const clone = (state) => Object.assign({}, state);

class Operator {
    constructor(name) {
        this.name = name;
        this.type = OpType.default;
    }

    description(state) { return ""; }

    prereqs(state) {
        return true;
    }

    permitted(state) {
        return true;
    }

    apply(state) {
        return clone(state);
    }
}

class PurchaseOperator extends Operator {
    constructor(name, prereqs, costs, yields) {
        super(name);

        if (!yields)[costs, yields] = [prereqs, costs];

        this.prereqs_ = typeof (prereqs) === 'function' ? prereqs : (s => prereqs);
        this.costs = typeof (costs) === 'function' ? costs : (s => costs);
        this.yields = typeof (yields) === 'function' ? yields : (s => yields);
    }

    description(state) {
        var from = Object.entries(this.costs(state)).map(([k, v]) => `${k}: ${v}`).join(", ");
        var to = Object.entries(this.yields(state)).map(([k, v]) => `${k}: ${v}`).join(", ");
        return from + " => " + to;
    }

    prereqs(state) {
        for (let [k, v] of Object.entries(this.prereqs_(state))) {
            if (state[k] < v) return false;
        }
        return true;
    }

    permitted(state) {
        for (let [k, v] of Object.entries(this.costs(state))) {
            if (state[k] < v) return false;
        }
        return true;
    }

    apply(state) {
        state = { ...state };
        for (let [k, v] of Object.entries(this.costs(state))) {
            state[k] -= v;
        }
        for (let [k, v] of Object.entries(this.yields(state))) {
            state[k] += v;
            var builtKey = k + "Built";
            if (builtKey in state) {
                state[builtKey]++;
            }
        }
        return state;
    }
}

class ResearchOperator extends PurchaseOperator {
    constructor(name, prereqs, costs, yields, key, dependencies) {
        super(name, prereqs, costs, yields);
        this.key = key;
        this.dependencies = dependencies;
        this.type = OpType.research
    }

    availablilityCheck(state) {
        let ok = state[this.key] !== 1;
        for (let dep of this.dependencies) {
            ok = state[dep] === 1;
        }
        return ok;
    }

    prereqs(state) {
        return super.prereqs(state) && this.availablilityCheck(state);
    }

    permitted(state) {
        return super.permitted(state) && this.availablilityCheck(state);
    }

    apply(state) {
        state = super.apply(state);
        state[this.key] = 1;
        return state;
    }
}

var buildTransistor = new PurchaseOperator("Build Transistor", {}, { transistors: 1 });
var buildComputer = new PurchaseOperator("Build Computer", s => (s.R_INTEGRATED_CIRCUITS ? { integratedCircuits: 5 } : { transistors: 10 }), { computers: 1 });
var buildFactory = new PurchaseOperator("Build Factory", { computers: 5 }, { factories: 1 });
var buildLab = new PurchaseOperator("Build Research Lab", s => ({ computers: 10 * (2 ** s.labsBuilt) }), { labs: 1 });

var buildIntegratedCircuit = new PurchaseOperator("Build Integrated Circuit", {R_INTEGRATED_CIRCUITS: 1}, {}, { integratedCircuits: 1 });

allOperators = [];
allOperators.push(buildTransistor);
allOperators.push(buildComputer);
allOperators.push(buildFactory);
allOperators.push(buildLab); 

allOperators.push(buildIntegratedCircuit); 


var researchIntegratedCircuits = new ResearchOperator("Research Integrated Circuits", { research: 50 }, { research: 100 }, {}, 'R_INTEGRATED_CIRCUITS', []);
var upgradeIntegratedCircuits1 = new ResearchOperator("Upgrade Integrated Circuits 1", { research: 100 }, { research: 200 }, {}, 'R_INTEGRATED_CIRCUITS_1', ["R_INTEGRATED_CIRCUITS"]);
var upgradeIntegratedCircuits2 = new ResearchOperator("Upgrade Integrated Circuits 2", {}, { research: 500 }, {}, 'R_INTEGRATED_CIRCUITS_2', ["R_INTEGRATED_CIRCUITS_1"]);
var upgradeIntegratedCircuits3 = new ResearchOperator("Upgrade Integrated Circuits 3", {}, { research: 1000 }, {}, 'R_INTEGRATED_CIRCUITS_3', ["R_INTEGRATED_CIRCUITS_2"]);
var upgradeIntegratedCircuits4 = new ResearchOperator("Upgrade Integrated Circuits 4", {}, { research: 2000 }, {}, 'R_INTEGRATED_CIRCUITS_4', ["R_INTEGRATED_CIRCUITS_3"]);
var upgradeIntegratedCircuits5 = new ResearchOperator("Upgrade Integrated Circuits 5", {}, { research: 10000 }, {}, 'R_INTEGRATED_CIRCUITS_5', ["R_INTEGRATED_CIRCUITS_4"]);
var upgradeIntegratedCircuits6 = new ResearchOperator("Upgrade Integrated Circuits 6", {}, { research: 100000 }, {}, 'R_INTEGRATED_CIRCUITS_6', ["R_INTEGRATED_CIRCUITS_5"]);
var upgradeIntegratedCircuits7 = new ResearchOperator("Upgrade Integrated Circuits 7", {}, { research: 1000000 }, {}, 'R_INTEGRATED_CIRCUITS_7', ["R_INTEGRATED_CIRCUITS_6"]);
var upgradeIntegratedCircuits8 = new ResearchOperator("Upgrade Integrated Circuits 8", {}, { research: 10000000 }, {}, 'R_INTEGRATED_CIRCUITS_8', ["R_INTEGRATED_CIRCUITS_7"]);
var upgradeIntegratedCircuits9 = new ResearchOperator("Upgrade Integrated Circuits 9", {}, { research: 100000000 }, {}, 'R_INTEGRATED_CIRCUITS_9', ["R_INTEGRATED_CIRCUITS_8"]);
var upgradeIntegratedCircuits10 = new ResearchOperator("Upgrade Integrated Circuits 10", {}, { research: 1000000000 }, {}, 'R_INTEGRATED_CIRCUITS_10', ["R_INTEGRATED_CIRCUITS_9"]); // 1 billion
allOperators.push(researchIntegratedCircuits);
allOperators.push(upgradeIntegratedCircuits1);
allOperators.push(upgradeIntegratedCircuits2);
allOperators.push(upgradeIntegratedCircuits3);
allOperators.push(upgradeIntegratedCircuits4);
allOperators.push(upgradeIntegratedCircuits5);
allOperators.push(upgradeIntegratedCircuits6);
allOperators.push(upgradeIntegratedCircuits7);
allOperators.push(upgradeIntegratedCircuits8);
allOperators.push(upgradeIntegratedCircuits9);
allOperators.push(upgradeIntegratedCircuits10);

var researchLanguage1 = new ResearchOperator("Research Language 1", {labs:50}, { research: 100 }, { }, 'R_LANGUAGE_1', []);
var researchLanguage2 = new ResearchOperator("Research Language 2", {}, { research: 1000 }, {}, 'R_LANGUAGE_2', ['R_LANGUAGE_1']);
var researchLanguage3 = new ResearchOperator("Research Language 3", {}, { research: 10000 }, {}, 'R_LANGUAGE_3', ['R_LANGUAGE_2']);
var researchLanguage4 = new ResearchOperator("Research Language 4", {}, { research: 100000 }, {}, 'R_LANGUAGE_4', ['R_LANGUAGE_3']);
var researchLanguage5 = new ResearchOperator("Research Language 5", {}, { research: 1000000 }, {}, 'R_LANGUAGE_5', ['R_LANGUAGE_4']);
allOperators.push(researchLanguage1);
allOperators.push(researchLanguage2);
allOperators.push(researchLanguage3);
allOperators.push(researchLanguage4);
allOperators.push(researchLanguage5);

//-----------------------------------------------------------------------------
// User Interface
//-----------------------------------------------------------------------------
g_statusUi = $("<h1></h1>");

function setupInterface() {
    $(document.body).append(g_statusUi);

    for (let operator of allOperators) {
        var button = $("<button>");
        button.click(() => handleOperatorClicked(operator));
        button.hide();
        $(document.body).append(button);

        operator.button = button;
    }
}

function updateInterface() {
    g_statusUi.text(JSON.stringify(g_currentState, 0, 4));

    for (let operator of allOperators) {
        if (operator.prereqs(g_currentState)) {
            operator.button.show();
        }

        if (operator.permitted(g_currentState)) {
            operator.button.prop("disabled", false);
        } else {
            operator.button.prop("disabled", true);
        }

        var opcontent = operator.name;
        var opdesc = operator.description(g_currentState);
        if (opdesc) opcontent += "<br/>(" + opdesc + ")";
        operator.button.html(opcontent);
    }
}

function handleOperatorClicked(operator) {
    if (operator.permitted(g_currentState)) {
        g_currentState = operator.apply(g_currentState);
        console.log(g_currentState);

        if (operator.type === OpType.research) {
            operator.button.remove();
        }

        // HACK: Research ICs replaces transistors w/ ICs.
        if (operator === researchIntegratedCircuits) {
            buildTransistor.button.remove();
            g_currentState.integratedCircuits = g_currentState.transistors;
            g_currentState.transistors = 0;
        }

        updateInterface();
    }
}

let backgroundIntervalSeconds = 0.1;
function backgroundTick() {
    g_currentState = { ...g_currentState };

    var dtransistors = g_currentState.factories * backgroundIntervalSeconds * 5 * g_speedUp;

    if (!g_currentState.R_INTEGRATED_CIRCUITS) {
        g_currentState.transistors += dtransistors;
        g_currentState.transistorsBuilt += dtransistors;
    } else {
        var researchLabOutputs = [2, 5, 10, 20, 50, 100, 500, 1500, 3000, 5000];
        var icUpgradeMultiplier = 1;
        for (var i = 0; i < researchLabOutputs.length; i++) {
            if (g_currentState["R_INTEGRATED_CIRCUITS_" + (i + 1)] === 1) {
                icUpgradeMultiplier = researchLabOutputs[i];
            }
        }

        var languageUpgradeMultipliers = [1.1, 1.2, 1.3, 1.4, 1.5];
        var languageUpgradeMultiplier = 1;
        for (var i = 0; i < languageUpgradeMultipliers.length; i++) {
            if (g_currentState["R_LANGUAGE_" + (i + 1)] === 1) {
                languageUpgradeMultiplier = languageUpgradeMultipliers[i];
            }
        }

        var researchLabOutput = icUpgradeMultiplier * languageUpgradeMultiplier;
        g_currentState.integratedCircuits += dtransistors * researchLabOutput;
        g_currentState.integratedCircuitsBuilt += dtransistors * researchLabOutput;
    }

    var dresearch = g_currentState.labs * backgroundIntervalSeconds * 1 * g_speedUp;
    g_currentState.research += dresearch;
    g_currentState.researchBuilt += dresearch;

    updateInterface();

    setTimeout(backgroundTick, backgroundIntervalSeconds * 1000);
}


function main() {
    setupInterface();
    updateInterface();
    backgroundTick();
}

window.onload = main;