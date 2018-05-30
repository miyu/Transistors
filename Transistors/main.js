$ = $;

const g_hacksEnabled = true;
const g_speedUp = g_hacksEnabled ? 50 : 1;
const g_eventSpeedUp = g_hacksEnabled ? 4 : 1;

const InitialState = {
    transistors: 0,
    transistorsBuilt: 0,
    computers: g_hacksEnabled ? 1000000 : 0,
    computersBuilt: 0,
    factories: g_hacksEnabled ? 1 : 0,
    factoriesBuilt: 0,
    labs: 0,
    labsBuilt: 0,
    research: 0,
    researchBuilt: 0,

    integratedCircuits: 0,
    integratedCircuitsBuilt: 0,

    popularity: 0.0,
    aiWinterPopularityThreshold: Infinity,
    activeEvents: {},

    R_INTEGRATED_CIRCUITS: 0,
};

let OpType = {
    default: 0,
    research: 1,
    event: 2,
}

let g_currentState = { ...InitialState };

const clone = (state) => Object.assign({}, state);

const isResearched = r => g_currentState[r] === 1;
const researchReward = (r, levels, def) => {
    var m = def || 1;
    for (var i = 0; i < levels.length; i++) {
        if (g_currentState[r + (i + 1)] === 1) {
            m = levels[i]
        }
    }
    return m;
};

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
        state[this.key + "_T"] = +(new Date());
        return state;
    }
}

class EventOperator extends ResearchOperator {
    constructor(name, prereqs, key, dependencies, cb, timecond) {
        super(name, prereqs, prereqs, {}, key, dependencies);
        this.type = OpType.event;
        this.cb = cb;
        this.timecond = timecond || {};
    }

    availablilityCheck(state) {
        const now = +(new Date());
        let ok = super.availablilityCheck(state);
        for (let [k, v] of Object.entries(this.timecond)) {
            var tkey = k + "_T";
            ok = ok && ((tkey in state) && ((now - state[k + "_T"]) > v));

        }
        return ok;
    }

    apply(state) {
        state = super.apply(state);

        if (this.cb) {
            state = this.cb(state) || state;
        }

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

var researchLanguage1 = new ResearchOperator("Research Language 1", { labs: 50 }, { research: 100 }, {}, 'R_LANGUAGE_1', []); // ASM
var researchLanguage2 = new ResearchOperator("Research Language 2", {}, { research: 1000 }, {}, 'R_LANGUAGE_2', ['R_LANGUAGE_1']); // Low-level
var researchLanguage3 = new ResearchOperator("Research Language 3", {}, { research: 10000 }, {}, 'R_LANGUAGE_3', ['R_LANGUAGE_2']); // C
var researchLanguage4 = new ResearchOperator("Research Language 4", {}, { research: 100000 }, {}, 'R_LANGUAGE_4', ['R_LANGUAGE_3']); 
var researchLanguage5 = new ResearchOperator("Research Language 5", {}, { research: 1000000 }, {}, 'R_LANGUAGE_5', ['R_LANGUAGE_4']); // Python
allOperators.push(researchLanguage1);
allOperators.push(researchLanguage2);
allOperators.push(researchLanguage3);
allOperators.push(researchLanguage4);
allOperators.push(researchLanguage5);

var industrialRobotics1 = new ResearchOperator("Industrial Robotics", { factories: 100 }, { research: 1000 }, {}, 'R_INDUSTRIAL_ROBOTICS_1', ['R_INTEGRATED_CIRCUITS']);
var industrialRobotics2 = new ResearchOperator("Direct Drive Arm", {}, { research: 100000 }, {}, 'R_INDUSTRIAL_ROBOTICS_2', ['R_INDUSTRIAL_ROBOTICS_1']);
var industrialRobotics3 = new ResearchOperator("ML Robots", {}, { research: 100000000 }, {}, 'R_INDUSTRIAL_ROBOTICS_3', ['R_INDUSTRIAL_ROBOTICS_2', 'R_ML_3']);
allOperators.push(industrialRobotics1);
allOperators.push(industrialRobotics2);
allOperators.push(industrialRobotics3);

var machineLearning1 = new ResearchOperator("Machine Learning I", { research: 500 }, { research: 1000 }, {}, 'R_ML_1', []);
var machineLearning2 = new ResearchOperator("Machine Learning II (backprop)", { labs: 100 }, { research: 1000000 }, {}, 'R_ML_2', ['R_ML_1']);
var machineLearning3 = new ResearchOperator("Machine Learning III", {}, { research: 1000000000 }, {}, 'R_ML_3', ['R_ML_2']);
var machineLearning4 = new ResearchOperator("Machine Learning IV", {}, { research: 100000000000 }, {}, 'R_ML_4', ['R_ML_3']);
allOperators.push(machineLearning1);
allOperators.push(machineLearning2);
allOperators.push(machineLearning3);
allOperators.push(machineLearning4);

var graphics1 = new ResearchOperator("Graphics I", { research: 2000 }, { research: 3000 }, {}, 'R_GRAPHICS_1', ['R_LANGUAGE_2']);
var graphics2 = new ResearchOperator("Graphics II", {}, { research: 10000 }, {}, 'R_GRAPHICS_2', ['R_GRAPHICS_1']);
var gpu1 = new ResearchOperator("GPUs I", { research: 30000 }, { research: 50000  }, {}, 'R_GPU_1', ['R_GRAPHICS_2']);
var gpu2 = new ResearchOperator("GPUs II", { research: 1000000000 }, { research: 5000000000 }, {}, 'R_GPU_2', ['R_GPU_1']);
allOperators.push(graphics1);
allOperators.push(graphics2);
allOperators.push(gpu1);
allOperators.push(gpu2);

// EVENTS
var perceptrons = new EventOperator("Perceptrons", {}, 'E_PERCEPTRONS', ['R_ML_1'], handlePerceptrons, { 'R_ML_1': 10000 / g_eventSpeedUp });
var aiWinter = new EventOperator("AI Winter", { research: 10000 }, 'E_AI_WINTER', ['E_PERCEPTRONS'], handleAiWinter, { 'E_PERCEPTRONS': 10000 / g_eventSpeedUp });
var aiWinterEnd = new EventOperator("AI Winter End", s => ({ popularity: s.aiWinterPopularityThreshold }), 'E_AI_WINTER_END', ['E_AI_WINTER'], handleAiWinterEnd, {});

function handlePerceptrons() {
    showNotification('E_PERCEPTRON_NOTIFICATION');
}

function handleAiWinter(state) {
    showNotification('E_AI_WINTER');

    state.activeEvents.aiWinter = {
        researchMultiplier: 2,
        researchRate: 0.75,
    };

    state.aiWinterPopularityThreshold = state.popularity;
    state.popularity -= 10;

    return state;
}

function handleAiWinterEnd(state) {
    showNotification('E_AI_WINTER_END');
    delete state.activeEvents.aiWinter;
}


allOperators.push(perceptrons);
allOperators.push(aiWinter);
allOperators.push(aiWinterEnd);

//-----------------------------------------------------------------------------
// User Interface
//-----------------------------------------------------------------------------
g_statusUi = $("<h1></h1>");

function setupInterface() {
    $('.notification-template').hide();
    $('#status-host').append(g_statusUi);

    for (let operator of allOperators) {
        var button = $("<button>");
        button.click(() => handleOperatorClicked(operator));
        button.hide();

        $("#control-host").append(button);
        operator.button = button;
    }
}

function updateInterface() {
    g_statusUi.text(JSON.stringify(g_currentState, 0, 4));

    for (let operator of allOperators) {
        if (operator.prereqs(g_currentState)) {
            operator.button.show();
        }

        var permitted = operator.permitted(g_currentState);
        operator.button.prop("disabled", !permitted);

        if (permitted && operator.type === OpType.event) {
            operator.button.click();
        }

        var opcontent = operator.name;
        var opdesc = operator.description(g_currentState);
        if (opdesc) opcontent += "<br/>(" + opdesc + ")";
        operator.button.html(opcontent);
    }
}

function showNotification(el) {
    const notif = $("#" + el);
    notif.show();
    $("#sidebar").prepend(notif);
}

function computePopularityDelta(x) {
    return x;
}

function handleOperatorClicked(operator) {
    if (operator.permitted(g_currentState)) {
        g_currentState = operator.apply(g_currentState);
        console.log(g_currentState);

        if (operator.type === OpType.research || operator.type === OpType.event) {
            operator.button.remove();
        }

        // HACK: Research ICs replaces transistors w/ ICs.
        if (operator === researchIntegratedCircuits) {
            buildTransistor.button.remove();
            g_currentState.integratedCircuits = g_currentState.transistors;
            g_currentState.transistors = 0;
        }

        // Events
        if (operator === buildComputer && g_currentState.computersBuilt === 1) {
            g_currentState.popularity += computePopularityDelta(1);
        }

        // AI Winter
        // on ML_1 && research 10000, AI Winter

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
        var roboticsMultiplier = researchReward('R_INDUSTRIAL_ROBOTICS_', [2, 5, 10], 1);
        var mlPower = researchReward('R_ML_', [2, 3, 4, 5], 1);

        var multiplier = (roboticsMultiplier) ** mlPower;
        console.log(dtransistors * multiplier);
        g_currentState.integratedCircuits += dtransistors * multiplier;
        g_currentState.integratedCircuitsBuilt += dtransistors * multiplier;
    }


    if (true) { // research lab => research
        var languageUpgradeMultipliers = [1.1, 1.2, 1.3, 1.4, 1.5];
        var languageUpgradeMultiplier = 1;
        for (var i = 0; i < languageUpgradeMultipliers.length; i++) {
            if (g_currentState["R_LANGUAGE_" + (i + 1)] === 1) {
                languageUpgradeMultiplier = languageUpgradeMultipliers[i];
            }
        }

        var researchLabOutputs = [2, 5, 10, 20, 50, 100, 500, 1500, 3000, 5000];
        var icUpgradeMultiplier = 1;
        for (var i = 0; i < researchLabOutputs.length; i++) {
            if (g_currentState["R_INTEGRATED_CIRCUITS_" + (i + 1)] === 1) {
                icUpgradeMultiplier = researchLabOutputs[i];
            }
        }

        var dresearch = g_currentState.labs * backgroundIntervalSeconds * icUpgradeMultiplier * g_speedUp;
        g_currentState.research += dresearch;
        g_currentState.researchBuilt += dresearch;
    }

    updateInterface();

    setTimeout(backgroundTick, backgroundIntervalSeconds * 1000);
}


function main() {
    setupInterface();
    updateInterface();
    backgroundTick();
}

window.onload = main;