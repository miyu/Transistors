// Midgame:

$ = $;

const clamp = (x, low, high) => Math.min(high, Math.max(low, x));

const thousand = 1000;
const million = thousand * thousand;
const billion = thousand * million;
const trillion = thousand * billion;
const quadrillion = thousand * trillion;
const quintillion = thousand * quadrillion;

const g_speedUpEnabled = true;
let g_debugSpeedUp = 2;
let g_speedUp = -1;
let g_eventSpeedUp = g_speedUpEnabled ? 4 : 1;

const g_initialStateBoost = window.location.search.includes("cheats") ? 100000000000 : 0;

const InitialState = {
    transistors: 0,
    transistorsBuilt: 0,
    computers: Math.min(g_initialStateBoost * 10, 10000),
    computersBuilt: Math.min(g_initialStateBoost * 10, 10000),
    factories: Math.min(g_initialStateBoost * 10, 10000),
    factoriesBuilt: Math.min(g_initialStateBoost * 10, 10000),
    factoryFactories: 0,
    factoryFactoriesBuilt: 0,
    labs: Math.min(g_initialStateBoost * 10, 1000),
    labsBuilt: Math.min(g_initialStateBoost * 10, 1000),
    research: Math.min(g_initialStateBoost * 10, 1000000000),
    researchBuilt: Math.min(g_initialStateBoost * 10, 1000000000),

    integratedCircuits: 0,
    integratedCircuitsBuilt: 0,

    popularity: 0.0,
    popularityLostToUnemployment: 0.0,

    unemployment: 0.0,
    unemployedAndEducated: 0.0,
    surveillanceEnabled: -1,
    
    robotTaxFactoryMultiplier: 1,

    aiWinterPopularityThreshold: Infinity,
    activeEvents: {},

    R_INTEGRATED_CIRCUITS: 0,
    
    gameOver: 0
};

let OpType = {
    default: 0,
    research: 1,
    event: 2,
}

const Welfare1Threshold = 1 * million;
const Welfare2Threshold = 100 * million;
const Welfare3Threshold = 1 * billion;
const Welfare4Threshold = 10 * billion;

let g_currentState = { ...InitialState };

const clone = (state) => Object.assign({}, state);

const isResearched = r => g_currentState[r] === 1;
const researchReward = (r, levels, def) => {
    var m = typeof def === 'undefined' ? 1 : def;
    for (var i = 0; i < levels.length; i++) {
        if (g_currentState[r + (i + 1)] === 1) {
            m = levels[i]
        }
    }
    return m;
};

const currentComputeUnits = s => {
    return s.transistors + s.integratedCircuits;
};

const totalComputeUnits = s => {
    return s.transistorsBuilt + s.integratedCircuitsBuilt;
};

const formatNumber = (x, dec) => x.toLocaleString(undefined, { minimumFractionDigits: Math.round(Math.log10(dec || 100)), maximumFractionDigits: Math.round(Math.log10(dec || 100)) })

function formatNumberMetricPrefix(n) {
    if (n >= quintillion) {
        return formatNumber(n / quintillion) + " Quintillion";
    } else if (n >= quadrillion) {
        return formatNumber(n / quadrillion) + " Quadrillion";
    } else if (n >= trillion) {
        return formatNumber(n / trillion) + " Trillion";
    } else if (n >= billion) {
        return formatNumber(n / billion) + " Billion";
    } else if (n >= million) {
        return formatNumber(n / million) + " Million";
    }
    return formatNumber(n, 1) + "";
}

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
        var from = Object.entries(this.costs(state)).map(([k, v]) => `${k}: ${formatNumberMetricPrefix(v)}`).join(", ");
        var to = Object.entries(this.yields(state)).map(([k, v]) => `${k}: ${formatNumberMetricPrefix(v)}`).join(", ");
        return from + " => " + to;
    }

    prereqs(state) {
        for (let [k, v] of Object.entries(this.prereqs_(state))) {
            if (k.startsWith('R_')) {
                if (state[k] != v) return false;
            } else {
                if (state[k] < v) return false;
            }
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
            if (k.includes("Built")) continue;
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
    constructor(name, prereqs, costs, yields, key, dependencies, cb, timecond) {
        super(name, prereqs, costs, yields);
        this.type = OpType.research

        this.key = key;
        this.dependencies = dependencies;
        this.cb = cb;
        this.timecond = timecond || {};
    }

    availablilityCheck(state) {
        let ok = state[this.key] !== 1;
        for (let dep of this.dependencies) {
            ok = ok && (state[dep] === 1);
        }
        const now = +(new Date());
        for (let [k, v] of Object.entries(this.timecond)) {
            var tkey = k + "_T";
            ok = ok && ((tkey in state) && ((now - state[k + "_T"]) > v));
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
        
        if (this.cb) {
            state = this.cb(state) || state;
        }

        return state;
    }
}

class EventOperator extends ResearchOperator {
    constructor(name, prereqs, key, dependencies, cb, timecond) {
        super(name, prereqs, {}, {}, key, dependencies, cb, timecond);
        this.type = OpType.event;
    }
    
    permitted(state) {
        return super.permitted(state) && super.prereqs(state);
    }
}
class UnemploymentEventOperator extends EventOperator {
    constructor(name, prereqs, key, dependencies, cb, timecond, popularityProportion) {
        super(name, prereqs, key, dependencies, cb, timecond);
        this.type = OpType.event;
        this.popularityProportion = popularityProportion;
    }
    
    prereqs(state) {
        return super.prereqs(state) && state.popularityLostToUnemployment >= state.popularity;
    }
    
    permitted(state) {
        const totalPop = state.popularityLostToUnemployment + state.popularity
        return state.popularityLostToUnemployment >= state.popularity * this.popularityProportion && super.permitted(state);//&& super.prereqs(state)
    }
}

var lerp1 = (val, min, max, rangemin, rangemax) => ((Math.max(Math.min(val, max), min) - min) / (max - min)) * (rangemax - rangemin) + rangemin;
var lerp2 = (val, min, max, rangemin, rangemax) => Math.pow((Math.max(Math.min(val, max), min) - min) / (max - min), 2) * (rangemax - rangemin) + rangemin;

var buildTransistor = new PurchaseOperator("Build Transistor", {}, { transistors: 1 });
var buildComputer = new PurchaseOperator("Build Computer", s => (s.R_INTEGRATED_CIRCUITS ? { integratedCircuits: 5 } : { transistors: 10 }), { computers: 1 });
var buildFactory = new PurchaseOperator("Build Factory", s => ({ computers: Math.floor(5 * ((isResearched('R_INDUSTRIAL_ROBOTICS_3') ? 1.2 : 1.3) ** (s.factoriesBuilt / Math.log(s.factoryFactories + 2)))) }), { factories: 1 });
var buildFactoryFactory = new PurchaseOperator("Build Factory Factory", { R_INDUSTRIAL_ROBOTICS_4: 1 }, s => ({ computers: Math.floor(100 * trillion * (1.1 ** s.factoryFactoriesBuilt)) }), { factoryFactories: 1 });

//  * lerp1(s.unemployedAndEducated / (10*billion), 0, 0.01, 1, Math.pow(1 / 1.15, 2000))
var buildLab = new PurchaseOperator("Build Research Lab", s => {
    const baseCost = 10;
    let expBase = isResearched('R_ACCEPT_SURVEILLANCE') ? 1.15 : 1.5;
    const expPower = s.labsBuilt;

    if (isResearched('R_COLLEGE_GRANTS_ADULTS')) {
        const nlabsdesired = lerp1(s.unemployedAndEducated / (10 * billion), 0, 0.03, 200, 2000) + 
                             lerp2(s.unemployedAndEducated / (10 * billion), 0, 1, 200, 20000);
        expBase = (expBase ** 200) ** (1 / nlabsdesired);
    }

    const computers = Math.floor(baseCost * (expBase ** expPower));
    return { computers }
}, { labs: 1 });

const labCost = (s, n) => {
    let computers = 0;
    s = clone(s);
    s.computers = Infinity;

    for (var i = 0; i < n; i++) {
        computers += buildLab.prereqs_(s).computers;
        s = buildLab.apply(s);
    }

    return computers;
}

var buildLab10 = new PurchaseOperator("Build Research Lab (10x)", { R_SPEED_UP_GAME_TIME_1: 1 }, s => ({ computers: labCost(s, 10) }), { labs: 10 });
var buildLab100 = new PurchaseOperator("Build Research Lab (100x)", { R_SPEED_UP_GAME_TIME_1: 1 }, s => ({ computers: labCost(s, 100) }), { labs: 100 });

var buildIntegratedCircuit = new PurchaseOperator("Build Integrated Circuit", {R_INTEGRATED_CIRCUITS: 1}, {}, { integratedCircuits: 1 });

allOperators = [];
allOperators.push(buildTransistor);
allOperators.push(buildComputer);
allOperators.push(buildFactory);
allOperators.push(buildFactoryFactory);
allOperators.push(buildLab); 
allOperators.push(buildLab10); 
allOperators.push(buildLab100); 

allOperators.push(buildIntegratedCircuit); 


var researchIntegratedCircuits = new ResearchOperator("Research Integrated Circuits", { research: 20 }, { research: 50 }, {}, 'R_INTEGRATED_CIRCUITS', []);
var upgradeIntegratedCircuits1 = new ResearchOperator("Upgrade Integrated Circuits", { research: 100 }, { research: 200 }, {}, 'R_INTEGRATED_CIRCUITS_1', ["R_INTEGRATED_CIRCUITS"]);
var upgradeIntegratedCircuits2 = new ResearchOperator("Upgrade Integrated Circuits 2", {}, { research: 500 }, {}, 'R_INTEGRATED_CIRCUITS_2', ["R_INTEGRATED_CIRCUITS_1"]);
var upgradeIntegratedCircuits3 = new ResearchOperator("Upgrade Integrated Circuits 3", {}, { research: 1000 }, {}, 'R_INTEGRATED_CIRCUITS_3', ["R_INTEGRATED_CIRCUITS_2"]);
var upgradeIntegratedCircuits4 = new ResearchOperator("Upgrade Integrated Circuits 4", {}, { research: 2000 }, {}, 'R_INTEGRATED_CIRCUITS_4', ["R_INTEGRATED_CIRCUITS_3"]);
var upgradeIntegratedCircuits5 = new ResearchOperator("Upgrade Integrated Circuits 5", {}, { research: 10000 }, {}, 'R_INTEGRATED_CIRCUITS_5', ["R_INTEGRATED_CIRCUITS_4"]);
var upgradeIntegratedCircuits6 = new ResearchOperator("Upgrade Integrated Circuits 6", {}, { research: 100000 }, {}, 'R_INTEGRATED_CIRCUITS_6', ["R_INTEGRATED_CIRCUITS_5"]);
var upgradeIntegratedCircuits7 = new ResearchOperator("Upgrade Integrated Circuits 7", {}, { research: 1000000 }, {}, 'R_INTEGRATED_CIRCUITS_7', ["R_INTEGRATED_CIRCUITS_6"]);
var upgradeIntegratedCircuits8 = new ResearchOperator("Upgrade Integrated Circuits 8", {}, { research: 10000000 }, {}, 'R_INTEGRATED_CIRCUITS_8', ["R_INTEGRATED_CIRCUITS_7"]);
var upgradeIntegratedCircuits9 = new ResearchOperator("Upgrade Integrated Circuits 9", {}, { research: 100000000 }, {}, 'R_INTEGRATED_CIRCUITS_9', ["R_INTEGRATED_CIRCUITS_8"]);
var upgradeIntegratedCircuits10 = new ResearchOperator("Upgrade Integrated Circuits 10", {}, { research: 1 * billion }, {}, 'R_INTEGRATED_CIRCUITS_10', ["R_INTEGRATED_CIRCUITS_9"]);
var upgradeIntegratedCircuits11 = new ResearchOperator("Upgrade Integrated Circuits 11", {}, { research: 10 * billion }, {}, 'R_INTEGRATED_CIRCUITS_11', ["R_INTEGRATED_CIRCUITS_10"]);
var upgradeIntegratedCircuits12 = new ResearchOperator("Upgrade Integrated Circuits 12", {}, { research: 100 * billion }, {}, 'R_INTEGRATED_CIRCUITS_12', ["R_INTEGRATED_CIRCUITS_11"]);
var upgradeIntegratedCircuits13 = new ResearchOperator("Upgrade Integrated Circuits 13", {}, { research: 1 * trillion }, {}, 'R_INTEGRATED_CIRCUITS_13', ["R_INTEGRATED_CIRCUITS_12"]);
var upgradeIntegratedCircuits14 = new ResearchOperator("Upgrade Integrated Circuits 14", {}, { research: 10 * trillion }, {}, 'R_INTEGRATED_CIRCUITS_14', ["R_INTEGRATED_CIRCUITS_13"]);
var upgradeIntegratedCircuits15 = new ResearchOperator("Upgrade Integrated Circuits 15", {}, { research: 100 * trillion }, {}, 'R_INTEGRATED_CIRCUITS_15', ["R_INTEGRATED_CIRCUITS_14"]);
var upgradeIntegratedCircuits16 = new ResearchOperator("Upgrade Integrated Circuits 16", {}, { research: 1 * quadrillion }, {}, 'R_INTEGRATED_CIRCUITS_16', ["R_INTEGRATED_CIRCUITS_15"]);
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
allOperators.push(upgradeIntegratedCircuits11);
allOperators.push(upgradeIntegratedCircuits12);
allOperators.push(upgradeIntegratedCircuits13);
allOperators.push(upgradeIntegratedCircuits14);
allOperators.push(upgradeIntegratedCircuits15);
allOperators.push(upgradeIntegratedCircuits16);

var researchLanguage1 = new ResearchOperator("Assembly Language", { labs: 5 }, { research: 100 }, {}, 'R_LANGUAGE_1', []); // ASM
var researchLanguage2 = new ResearchOperator("Basic Programming Languages", {}, { research: 1000 }, {}, 'R_LANGUAGE_2', ['R_LANGUAGE_1']); // Low-level
var researchLanguage3 = new ResearchOperator("Low-level Programming Languages", {}, { research: 10000 }, {}, 'R_LANGUAGE_3', ['R_LANGUAGE_2']); // C
var researchLanguage4 = new ResearchOperator("High-level Programming Languages", {}, { research: 100000 }, {}, 'R_LANGUAGE_4', ['R_LANGUAGE_3'], handleAddPopularityFactory(1)); 
var researchLanguage5 = new ResearchOperator("General-purpose Scripting Languages", {}, { research: 1000000 }, {}, 'R_LANGUAGE_5', ['R_LANGUAGE_4'], handleAddPopularityFactory(2)); // Python
allOperators.push(researchLanguage1);
allOperators.push(researchLanguage2);
allOperators.push(researchLanguage3);
allOperators.push(researchLanguage4);
allOperators.push(researchLanguage5);

var industrialRobotics1 = new ResearchOperator("Industrial Robotics", { factoriesBuilt: 5 }, { factoriesBuilt: 10, research: 100 }, {}, 'R_INDUSTRIAL_ROBOTICS_1', ['R_INTEGRATED_CIRCUITS'], () => showNotification('R_INDUSTRIAL_ROBOTICS_1'));
var industrialRobotics2 = new ResearchOperator("Direct Drive Arm", {}, { research: 1000 }, {}, 'R_INDUSTRIAL_ROBOTICS_2', ['R_INDUSTRIAL_ROBOTICS_1']);
var industrialRobotics3 = new ResearchOperator("Machine-Learning-Powered Robots", { research: 0.5 * billion }, { research: 1 * billion }, {}, 'R_INDUSTRIAL_ROBOTICS_3', ['R_INDUSTRIAL_ROBOTICS_2', 'R_ML_3']);
var industrialRobotics4 = new ResearchOperator("Self-Replication", { research: 1 * billion, R_COLLEGE_GRANTS_ADULTS: 1 }, { research: 5 * billion }, {}, 'R_INDUSTRIAL_ROBOTICS_4', ['R_INDUSTRIAL_ROBOTICS_3', 'R_ML_5']);
allOperators.push(industrialRobotics1);
allOperators.push(industrialRobotics2);
allOperators.push(industrialRobotics3);
allOperators.push(industrialRobotics4);

var machineLearning1 = new ResearchOperator("Machine Learning: Neural Networks", { research: 500 }, { research: 1000 }, {}, 'R_ML_1', []);
var machineLearning2 = new ResearchOperator("Machine Learning: Backpropagation", { labsBuilt: 5 }, { labsBuilt: 15, research: 5000 }, {}, 'R_ML_2', ['R_ML_1'], null, { 'E_AI_WINTER': 10000 / g_eventSpeedUp });
var machineLearning3 = new ResearchOperator("Machine Learning: Long-Short Term Memory Recurrent Neural Networks", {}, { research: 2 * million }, {}, 'R_ML_3', ['R_ML_2', 'R_GPU_3']);
var machineLearning4 = new ResearchOperator("Machine Learning IV: Very Deep Networks", {}, { research: 50 * million }, {}, 'R_ML_4', ['R_ML_3']);
var machineLearning5 = new ResearchOperator("Machine Learning V: (Future)", {},  { research: 500 * million }, {}, 'R_ML_5', ['R_ML_4', 'R_GPU_4']);
allOperators.push(machineLearning1);
allOperators.push(machineLearning2);
allOperators.push(machineLearning3);
allOperators.push(machineLearning4);
allOperators.push(machineLearning5);

var selfDrivingCars = new ResearchOperator("Self-Driving Cars", {research: 200 * million}, { research: 500 * million }, {}, 'R_SELF_DRIVING_CARS', ['R_ML_4'], handleAddPopularityFactory(5));
allOperators.push(selfDrivingCars);

var virtualAssistants = new ResearchOperator("Virtual Assistants", {research: 75 * million}, { research: 100 * million }, {}, 'R_VIRTUAL_ASSISTANTS', ['R_ML_4'], handleAddPopularityFactory(5));
var personalAssitantRobots = new ResearchOperator("Personal Assistant Robots", {},  { research: 500 * million }, {}, 'R_PERSONAL_ASSISTANT_ROBOTS', ['R_VIRTUAL_ASSISTANTS'], handleAddPopularityFactory(8));
allOperators.push(virtualAssistants);
allOperators.push(personalAssitantRobots);

var computerImplants = new ResearchOperator("Computer Implants", {research: 25 * billion},  { research: 50 * billion }, {}, 'R_COMPUTER_IMPLANTS', ['R_ML_5'], handleAddPopularityFactory(8));
allOperators.push(computerImplants);
var neuralVR = new ResearchOperator("Neural Virtual Reality", {research: 100 * trillion},  { research: 500 * trillion }, {}, 'R_NEURAL_VR', ['R_COMPUTER_IMPLANTS', 'R_VR'], handleAddPopularityFactory(10));
allOperators.push(neuralVR);


var eventAlphago = new EventOperator("AI wins in Go against top-ranked player in the world", { }, 'E_ALPHAGO', ['R_ML_4'], handleAlphago, { 'R_ML_4': 30000 / g_eventSpeedUp });
function handleAlphago(state) {
    showNotification('E_ALPHAGO')
    handleAddPopularityFactory(3)(state);
}

var eventMLFrameworks = new EventOperator("Machine learning frameworks", { }, 'E_ML_FRAMEWORKS', ['R_ML_4', 'R_LANGUAGE_5'], handleAlphago, { 'R_ML_4': 15000 / g_eventSpeedUp });
function handleAlphago(state) {
    showNotification('E_ML_FRAMEWORKS')
    handleAddPopularityFactory(5)(state);
}
allOperators.push(eventAlphago);
allOperators.push(eventMLFrameworks);

var graphics0 = new ResearchOperator("Text-based User Interfaces", { research: 100 }, { research: 200 }, {}, 'R_GRAPHICS_0', ['R_LANGUAGE_1']);
var graphics1 = new ResearchOperator("Graphical User Interfaces", { research: 1000 }, { research: 1500 }, {}, 'R_GRAPHICS_1', ['R_GRAPHICS_0']);
var graphics2 = new ResearchOperator("3D Graphics", {}, { research: 10000 }, {}, 'R_GRAPHICS_2', ['R_GRAPHICS_1']);
var graphicsFirstMice = new ResearchOperator("The Mouse", { research: 2000 }, { research: 2500 }, {}, 'R_MOUSE', ['R_GRAPHICS_1']);

var eventInventionOfMouse = new EventOperator("The Invention of the Mouse", { }, 'E_MOUSE_INVENTION', ['R_MOUSE'], () => showNotification('E_MOUSE_INVENTED'), { });
var eventPersonalComputing = new EventOperator("Personal Computing", { }, 'E_PERSONAL_COMPUTING', ['E_MOUSE_INVENTION', 'R_COMPUTERS_MASS_PRODUCED'], handlePersonalComputing, { E_MOUSE_INVENTION: 10000 / g_eventSpeedUp });

var research2DGames = new ResearchOperator("2D Computer Games", { }, { research: 5000 }, {}, 'R_COMPUTER_GAMES_2D', ['E_PERSONAL_COMPUTING'], handleResearch2DGames);
var gpu1 = new ResearchOperator("GPUs", { research: 10000 }, { research: 15000  }, {}, 'R_GPU_1', ['R_COMPUTER_GAMES_2D']); //90s GPUs

var research3DGames = new ResearchOperator("3D Computer Games", { research: 10000 }, { research: 15000 }, {}, 'R_COMPUTER_GAMES_3D', ['R_COMPUTER_GAMES_2D', 'R_GRAPHICS_2'], handleResearch3DGames);
var gpu2 = new ResearchOperator("GPUs II", { research: 100 * thousand }, { research: 150 * thousand }, {}, 'R_GPU_2', ['R_GPU_1', 'R_COMPUTER_GAMES_3D']); // 2000's GPUs
var gpu3 = new ResearchOperator("GPUs III", { research: 1 * million }, { research: 1.5 * million }, {}, 'R_GPU_3', ['R_GPU_2']); // modern GPUs & compute
var gpu4 = new ResearchOperator("GPUs IV", { research: 100 * million }, { research: 200 * million }, {}, 'R_GPU_4', ['R_GPU_3']); // future GPUs
var virtualReality = new ResearchOperator("Virtual Reality", { research: 1000000 }, { research: 2000000 }, {}, 'R_VR', ['R_GPU_3'], handleResearchVirtualReality);
var augmentedReality = new ResearchOperator("Augmented Reality", { }, { research: 10000000 }, {}, 'R_AR', ['R_VR'], handleAddPopularityFactory(5));

var iot = new ResearchOperator("Internet of Things", { research: 1000000 }, { research: 10000000 }, {}, 'R_IOT', ['R_ML_3', 'R_NETWORKING_2'], handleAddPopularityFactory(5));

allOperators.push(graphics0);
allOperators.push(graphics1);
allOperators.push(graphics2);
allOperators.push(graphicsFirstMice);

allOperators.push(eventInventionOfMouse);
allOperators.push(eventPersonalComputing);

allOperators.push(research2DGames);
allOperators.push(research3DGames);
allOperators.push(gpu1);
allOperators.push(gpu2);
allOperators.push(gpu3);
allOperators.push(gpu4);
allOperators.push(virtualReality);
allOperators.push(augmentedReality);

allOperators.push(iot);

var networking1 = new ResearchOperator("Networks", { research: 500 }, { research: 1000 }, {}, 'R_NETWORKING_1', ['R_LANGUAGE_1']);
var networking2 = new ResearchOperator("The Internet", { research: 1000 }, { research: 1500 }, {}, 'R_NETWORKING_2', ['R_NETWORKING_1']);
var email = new ResearchOperator("Email", { research: 100 }, { research: 200 }, {}, 'R_EMAIL', ['R_GRAPHICS_0', 'R_NETWORKING_2'], handleAddPopularityFactory(1));
var instantMessaging = new ResearchOperator("Instant Messaging", { research: 200 }, { research: 400 }, {}, 'R_CHAT', ['R_GRAPHICS_0', 'R_NETWORKING_2'], handleAddPopularityFactory(1));
var browsers = new ResearchOperator("Web Browsers", { research: 1500 }, { research: 2500 }, {}, 'R_BROWSERS', ['R_GRAPHICS_1', 'R_NETWORKING_2', 'E_PERSONAL_COMPUTING'], handleAddPopularityFactory(1));

allOperators.push(networking1);
allOperators.push(networking2);
allOperators.push(email);
allOperators.push(instantMessaging);
allOperators.push(browsers);

var acceptSurveillance = new ResearchOperator("Accept Government Surveillance", {}, {}, { surveillanceEnabled: 2 }, 'R_ACCEPT_SURVEILLANCE', ['E_GVT_SURVEILLANCE_AVAILABLE'], null, {  });
allOperators.push(acceptSurveillance);

var surveillanceAvailableEvent = new EventOperator("Government Surveillance", {}, 'E_GVT_SURVEILLANCE_AVAILABLE', ['R_EMAIL', 'R_CHAT', 'R_BROWSERS'], () => showNotification('E_GVT_SURVEILLANCE_AVAILABLE'), { 'R_EMAIL': 5000 / g_eventSpeedUp, 'R_CHAT': 5000 / g_eventSpeedUp, 'R_BROWSERS': 5000 / g_eventSpeedUp });
allOperators.push(surveillanceAvailableEvent)

var surveillanceRevealedEvent = new EventOperator("Government Surveillance", {}, 'E_GVT_SURVEILLANCE_REVEALED', ['E_GVT_SURVEILLANCE_AVAILABLE'], handleSurveillanceRevealed, { 'E_GVT_SURVEILLANCE_AVAILABLE': 120000 / g_eventSpeedUp });
allOperators.push(surveillanceRevealedEvent)
function handleSurveillanceRevealed(state) {
    showNotification('E_GVT_SURVEILLANCE_REVEALED');
    state.popularity -= computePopularityDeltaScale(g_currentState, 8);
}

function handleAddPopularityFactory(n) {
    return state => {
        state.popularity += computePopularityDeltaScale(g_currentState, n);
    };
}

function handleResearch2DGames(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 2);
}

function handleResearch3DGames(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 2);
}

function handleResearchVirtualReality(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 3);
}

var computersMassProduced = new ResearchOperator("Computers Mass Produced", { research: 100 }, { research: 500 }, {}, 'R_COMPUTERS_MASS_PRODUCED', ['R_INDUSTRIAL_ROBOTICS_1']);
allOperators.push(computersMassProduced);

// EVENTS s => ({ popularity: s.aiWinterPopularityThreshold })
var perceptrons = new EventOperator("Perceptrons", {}, 'E_PERCEPTRONS', ['R_ML_1'], handlePerceptrons, { 'R_ML_1': 10000 / g_eventSpeedUp });
var aiWinter = new EventOperator("AI Winter", { research: 10000 }, 'E_AI_WINTER', ['E_PERCEPTRONS'], handleAiWinter, { 'E_PERCEPTRONS': 10000 / g_eventSpeedUp });
var aiWinterEnd = new EventOperator("AI Winter End", {}, 'E_AI_WINTER_END', ['E_AI_WINTER', 'R_ML_2'], handleAiWinterEnd, {});

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
    state.popularity -= computePopularityDeltaScale(g_currentState, 2);

    return state;
}

function handleAiWinterEnd(state) {
    showNotification('E_AI_WINTER_END');
    delete state.activeEvents.aiWinter;
}


allOperators.push(perceptrons);
allOperators.push(aiWinter);
allOperators.push(aiWinterEnd);

var eventFirstTransistor = new EventOperator("First Transistor", { transistorsBuilt: 1 }, 'E_FIRST_TRANSISTOR', [], () => showNotification('E_FIRST_TRANSISTOR'), { });
var eventFirstComputer = new EventOperator("First Computer", { computersBuilt: 1 }, 'E_FIRST_COMPUTER', [], handleFirstComputer, { });
function handleFirstComputer(state) {
    showNotification('E_FIRST_COMPUTER');
    state.popularity += computePopularityDeltaScale(g_currentState, 1);
}
var eventFirstIntegratedCircuit = new EventOperator("First Integrated Circuit", { integratedCircuitsBuilt: 1 }, 'E_FIRST_INTEGRATED_CIRCUIT', [], () => showNotification('E_FIRST_INTEGRATED_CIRCUIT'), { });
allOperators.push(eventFirstTransistor);
allOperators.push(eventFirstComputer);
allOperators.push(eventFirstIntegratedCircuit);

function handlePersonalComputing(state) {
    showNotification('E_PERSONAL_COMPUTING');
    state.popularity += computePopularityDeltaScale(g_currentState, 3);
}

var eventReeducation = new EventOperator("Reeducation Available", { unemployment: 10000 }, 'E_REEDUCATION_AVAILABLE', [], () => showNotification('E_REEDUCATION_AVAILABLE'), { });
var researchReeducation = new ResearchOperator("Reeducation", {}, { research: 50000 }, {}, 'R_REEDUCATION', ['E_REEDUCATION_AVAILABLE']);
allOperators.push(eventReeducation);
allOperators.push(researchReeducation);

var eventWelfare = new EventOperator("Welfare Available", { unemployment: 10000 }, 'E_WELFARE_AVAILABLE', [], () => showNotification('E_WELFARE_AVAILABLE'), { R_REEDUCATION: 15000 / g_eventSpeedUp });
var researchWelfare1 = new ResearchOperator("Welfare", { unemployment: 10000 }, { integratedCircuits: 1 * million }, {}, 'R_WELFARE_1', ['E_WELFARE_AVAILABLE'], null, {/*E_WELFARE_AVAILABLE: 10000 / g_eventSpeedUp*/});
var researchWelfare2 = new ResearchOperator("Welfare II", { unemployment: Welfare1Threshold }, { integratedCircuits: 1 * quadrillion }, {}, 'R_WELFARE_2', ['R_WELFARE_1'], null, {R_WELFARE_1: 10000 / g_eventSpeedUp});
var researchWelfare3 = new ResearchOperator("Welfare III", { unemployment: Welfare2Threshold / 100 }, { integratedCircuits: 10 * quadrillion }, {}, 'R_WELFARE_3', ['R_WELFARE_2'], null, {R_WELFARE_2: 10000 / g_eventSpeedUp});
var researchWelfare4 = new ResearchOperator("Welfare IV (Automation)", { unemployment: Welfare3Threshold / 100 }, { research: 1 * trillion }, {}, 'R_WELFARE_4', ['R_WELFARE_3'], null, {R_WELFARE_3: 10000 / g_eventSpeedUp});

// var researchCollegeGrants1 = new ResearchOperator("College Grants", {}, { research: 1 * billion }, {}, 'R_COLLEGE_GRANTS_ADULTS', ['E_REEDUCATION_AVAILABLE']);
var researchCollegeGrants2 = new ResearchOperator("College Grants for Adults", {}, { research: 1 * billion }, {}, 'R_COLLEGE_GRANTS_ADULTS', ['R_INDUSTRIAL_ROBOTICS_3', 'R_WELFARE_2']);
var researchTimeSpeedup1 = new ResearchOperator("Speed up Game Time I (10x)", {}, {}, {}, 'R_SPEED_UP_GAME_TIME_1', ['R_COLLEGE_GRANTS_ADULTS']);
// var researchTimeSpeedup2 = new ResearchOperator("Speed up Game Time II (10x)", {}, {}, {}, 'R_SPEED_UP_GAME_TIME_2', ['R_SPEED_UP_GAME_TIME_1']);

allOperators.push(eventWelfare);
allOperators.push(researchWelfare1);
allOperators.push(researchWelfare2);
allOperators.push(researchWelfare3);
allOperators.push(researchWelfare4);
allOperators.push(researchCollegeGrants2);
allOperators.push(researchTimeSpeedup1);

var unemployment25Pct = new UnemploymentEventOperator("Unemployment Warning", { }, 'E_UNEMPLOYMENT_WARNING', ['E_REEDUCATION_AVAILABLE'], handleUnemployment25Pct, { }, .25);
allOperators.push(unemployment25Pct);
function handleUnemployment25Pct(state) {
    showNotification('E_UNEMPLOYMENT_WARNING');
}

var unemployment50Pct = new UnemploymentEventOperator("Unemployment Robot Tax", { }, 'E_ROBOT_TAX', ['E_REEDUCATION_AVAILABLE'], handleUnemployment50Pct, { }, .5);
function handleUnemployment50Pct(state) {
    showNotification('E_ROBOT_TAX');
    state.robotTaxFactoryMultiplier = .5;
}
allOperators.push(unemployment50Pct);

var unemployment75Pct = new UnemploymentEventOperator("Unemployment Riots", { }, 'E_RIOTS', ['E_REEDUCATION_AVAILABLE'], handleUnemployment75Pct, { }, .75);
function handleUnemployment75Pct(state) {
    showNotification('E_RIOTS');
    state.factories /= 4;
    state.labs /= 2;
}
allOperators.push(unemployment75Pct);

var unemploymentLose = new UnemploymentEventOperator("Lose", { }, 'E_LOSE', ['E_REEDUCATION_AVAILABLE'], handleUnemploymentLose, { }, 1);
function handleUnemploymentLose(state) {
    showNotification('E_LOSE');
    state.factories = 0;
    state.labs = 0;
    state.gameOver = 1;
}
allOperators.push(unemploymentLose);

function dumpGraph() {
    const nodes = [];
    const edges = [];
    for (let op of allOperators) {
        if (!(op instanceof ResearchOperator)) continue;
        nodes.push(`${op.key} [label="${op.name}", xlabel="${op.description(g_currentState)}"];`);

        for (let dep of op.dependencies) {
            edges.push(`${dep} -> ${op.key}`);
        }
    }

    const nl = '\r\n';
    console.log(
        "digraph g {" + nl +
        "    forcelabels=true;" + nl +
        nodes.map(x => '    ' + x).join(nl) + nl +
        edges.map(x => '    ' + x).join(nl) + nl +
        "}");
}

//-----------------------------------------------------------------------------
// User Interface
//-----------------------------------------------------------------------------
g_statusUiAllTime = $("<h1></h1>");
g_statusUiInventory = $("<p></p>");
g_debugStatusUi = $("<h1 style='font-size: 8px'></h1>");
g_computeUnitSliderHost = $("#computeUnitSliderHost");
g_transistorsVsComputersSlider = $("#computeUnitSlider");
g_researchVsReeducationSliderHost = $("#reeducationSliderHost");
g_researchVsReeducationSlider = $("#reeducationSlider");

function setupInterface() {
    $('.notification-template').hide();
    $('#status-host').append(g_statusUiAllTime);
    $('#status-host').append(g_statusUiInventory);
    $('#debug-status-host').append(g_debugStatusUi);
    g_computeUnitSliderHost[0].style.visibility = "hidden";
    g_researchVsReeducationSliderHost[0].style.visibility = "hidden";

    for (let operator of allOperators) {
        var button = $("<button>");
        button.click(() => handleOperatorClicked(operator));

        operator.hover = false;
        button.mouseenter(() => {operator.hover = true});
        button.mouseleave(() => {operator.hover = false});

        if (operator.name.includes("Build") && operator.name.includes("x)")) {
            const n = operator.name.substring(operator.name.indexOf('(') + 1, operator.name.indexOf('x)'));
            const text = operator.name.substring(0, operator.name.indexOf('(')).trim()
            const baseop = allOperators.filter(o => o.name === text)[0]

            baseop.div.append(button)
            baseop.div.append(baseop.p)
            baseop.alts.push(operator);

            operator.button = button;
            operator.button.short = true;
            operator.button.text("x" + n);
            operator.div = button;
            operator.p = $("<p>")
            continue;
        }
        
        var div = $("<div class='operator'></div>")
        div.append(button);
        div.hide();

        var p = $("<p>")
        div.append(p);

        if (operator.type === OpType.research) {
            $("#research-host").append(div);
        } else {
            $("#control-host").append(div);
        }

        operator.button = button;
        operator.div = div;
        operator.p = p;
        operator.alts = [];
    }
}

let g_lastLines = []
let g_ticksToDelta = 10;
let g_ticksCounter = 0;

function updateInterface(updateDeltas) {
    var json = "{ " + Object.entries(g_currentState).map(([k, v]) => k + ": " + (typeof v === 'number' ? v.toFixed(1) : '[object]')).join(", ") + " }";
    g_debugStatusUi.text(json);

    var trIc = g_currentState.integratedCircuitsBuilt ? "Integrated Circuits" : "Transistors";
    g_statusUiAllTime.html(formatNumber(g_currentState.transistorsBuilt + g_currentState.integratedCircuitsBuilt, 1) + " " + trIc + " Built");

    var lines = [
        [g_currentState.transistors + g_currentState.integratedCircuits, trIc, true, true],
        [g_currentState.computers, "Computers", g_currentState.factoriesBuilt > 0, g_currentState.computersBuilt > 0],
        [g_currentState.factories, "Factories", false, g_currentState.factoriesBuilt > 0],
        [g_currentState.factoryFactories, "Factory Factories", false, g_currentState.factoryFactoriesBuilt > 0],
        [g_currentState.labs, "Labs", false, g_currentState.labsBuilt > 0],
        [g_currentState.research, "Research", true, g_currentState.labsBuilt > 0],
        [g_currentState.popularity, "Popularity", true, true]
    ];

    if (!isResearched('R_INDUSTRIAL_ROBOTICS_3')) {
        lines.push([g_currentState.unemployment, " Unemployed due to automation", true, true]);
    }

    const lastLines = g_lastLines;
    if (updateDeltas) {
        g_ticksCounter--;
        if (g_ticksCounter <= g_ticksToDelta) {
            g_lastLines = JSON.parse(JSON.stringify(lines))
            g_ticksCounter = g_ticksToDelta;
        }
    }
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (i >= lastLines.length) {
            l.push(0);
        } else {
            const delta = l[0] - lastLines[i][0];
            l.push(delta / (backgroundIntervalSeconds * g_ticksToDelta));
        }

        lines[i] = [formatNumberMetricPrefix(l[0]) + " " + l[1] + (l[2] ? (" (" + formatNumberMetricPrefix(l[4] * 4) + "/Second)") : ""), l[3]]
    }

    lines.unshift(['<u>Inventory:</u>', "", false, true]);
    
    if (isResearched('R_INDUSTRIAL_ROBOTICS_3')) {
        if (isResearched('R_SPEED_UP_GAME_TIME_1')) {
            lines.push(["10x Game Speed", true])
        }

        lines.push(["", true]);
        lines.push(["<b>" + formatNumber(100 * (g_currentState.unemployment + g_currentState.unemployedAndEducated) / (10 * billion), billion) + "% of world unemployed due to automation:</b>", true]);
        lines.push(["&nbsp;&nbsp;&nbsp;&nbsp;" + formatNumberMetricPrefix(g_currentState.unemployment) + " Uneducated", true]);
        lines.push(["&nbsp;&nbsp;&nbsp;&nbsp;" + formatNumberMetricPrefix(g_currentState.unemployedAndEducated) + " Educated", true]);
    }

    var text = lines.filter(([t, ok]) => ok).map(([t, ok]) => t).join("<br/>")
    g_statusUiInventory.html(text)

    for (let operator of allOperators) {

        if (operator.prereqs(g_currentState)) {
            operator.div.show();
        }

        var permitted = operator.permitted(g_currentState);
        operator.button.prop("disabled", !permitted);

        if (permitted && operator.type === OpType.event) {
            operator.button.click();
        }

        if (operator.button.short) continue;

        var opcontent = operator.name;
        if (operator.type === OpType.research) {
            var opdesc = operator.description(g_currentState);
            opcontent += "<br/>(" + opdesc + ")";
        } else {
            var opdesc = operator.description(g_currentState);
            if (opdesc) {
                let cop = operator;
                if (!operator.button.short) {
                    for (let alt of operator.alts) {
                        if (alt.hover) {
                            cop = alt;
                            opdesc = cop.description(g_currentState);
                            break;
                        }
                    }
                }
                
                opdesc = opdesc.trim();
                var [costs, yields] = opdesc.split("=>");
                if (costs) {
                    var [what, units] = costs.split(": ");
                    if (what === "integratedCircuits") what = "Integrated Circuits";
                    opdesc = "Cost: " + units + what;

                    operator.p.html(opdesc);
                }
            }
        }
        operator.button.html(opcontent);
    }
    
    if (isResearched('R_COMPUTERS_MASS_PRODUCED')) {
        g_computeUnitSliderHost[0].style.visibility = "";
    }

    if (isResearched('R_REEDUCATION')) {
        g_researchVsReeducationSliderHost[0].style.visibility = "";
    }
}

function showNotification(el) {
    const notif = $("#" + el);
    notif.show();
    $("#sidebar").prepend(notif);
}

function computePopularityDeltaScale(s, x) {
    if (x === undefined) throw "arg 2 probably missing";
    return x * Math.log(totalComputeUnits(s) + 2); // 2 so tests fine if at 0 transistors
}

function handleOperatorClicked(operator) {
    if (operator.permitted(g_currentState)) {
        g_currentState = operator.apply(g_currentState);
        // console.log(g_currentState);

        if (operator.type === OpType.research || operator.type === OpType.event) {
            operator.button.remove();
        }

        // HACK: Research ICs replaces transistors w/ ICs.
        if (operator === researchIntegratedCircuits) {
            buildTransistor.button.remove();
            g_currentState.integratedCircuits = g_currentState.transistors;
            g_currentState.transistors = 0;
        }

        // HACK: Rapidly building factories increases unemployment.
        if (operator === buildFactory && g_currentState.factories < 150) {
            // const now = +(new Date());
            // const timeSinceLast = now - g_currentState.factoriesBuiltLastTime;
            const unemploymentDeltaMultiplier = researchReward('R_INDUSTRIAL_ROBOTICS_', [5, 30, 500, 500], 0);
            let unemploymentChange = 10 * unemploymentDeltaMultiplier * (1.04 ** g_currentState.factoriesBuilt);
            unemploymentChange = Math.min(unemploymentChange, 123456);
            g_currentState.unemployment += unemploymentChange;
        }

        // HACK: Building research lab decreases unemployment by 1
        if (operator === buildLab) {
            g_currentState.unemployment = clamp(g_currentState.unemployment, 0, Infinity);
        }

        // Events
        if (operator === buildComputer && g_currentState.computersBuilt === 1) {
            g_currentState.popularity += computePopularityDeltaScale(g_currentState, 1);
        }

        // AI Winter
        // on ML_1 && research 10000, AI Winter

        updateInterface(false);
    }
}

let backgroundIntervalSeconds = 0.1;
function backgroundTick() {
    g_currentState = { ...g_currentState };
    
    if (g_currentState.gameOver)
        return;
    
    g_speedUp = g_debugSpeedUp;
    if (isResearched("R_SPEED_UP_GAME_TIME_1")) {
        g_speedUp *= 10;
    }

    var workUnitsBase = g_currentState.factories * backgroundIntervalSeconds * 5 * g_speedUp;

    if (!g_currentState.R_INTEGRATED_CIRCUITS) {
        g_currentState.transistors += workUnitsBase;
        g_currentState.transistorsBuilt += workUnitsBase;
    } else {
        var roboticsMultiplier = researchReward('R_INDUSTRIAL_ROBOTICS_', [2, 5, 10], 1);
        var mlPower = researchReward('R_ML_', [2, 3, 5, 8, 11], 1);
        // console.log('ml power', roboticsMultiplier, mlPower, roboticsMultiplier ** mlPower)

        var percentComputerEffort = ~~(g_transistorsVsComputersSlider.val()) / 100;
        var percentTransistorEffort = 1 - percentComputerEffort;

        var surveillanceMultiplier = isResearched('R_ACCEPT_SURVEILLANCE') ? 10 : 1;

        var welfareMultiplier = researchReward('R_WELFARE_', [0.5, 0.5 / 20, 0.5 / (20 * 5), 0.5 / (20 * 5 * 2)], 1);
        
        var robotTaxFactoryMultiplier = g_currentState.robotTaxFactoryMultiplier || 1; //HACK to work with previous saves
        
        const workUnitsTransformed = surveillanceMultiplier * welfareMultiplier * ((roboticsMultiplier) ** mlPower) * workUnitsBase * robotTaxFactoryMultiplier;

        // Transistors
        var buildIcOps = workUnitsTransformed * percentTransistorEffort;
        g_currentState.integratedCircuits += buildIcOps;
        g_currentState.integratedCircuitsBuilt += buildIcOps;

        // Computers
        const maxBuildComputerOps = workUnitsTransformed * percentComputerEffort;
        const costIc = buildComputer.costs(g_currentState).integratedCircuits;
        const yieldsComputers = buildComputer.yields(g_currentState).computers;
        const buildComputerOps = Math.min(maxBuildComputerOps, g_currentState.integratedCircuits / costIc);
        // console.log(buildIcOps, workUnitsTransformed, percentTransistorEffort, "!!!", maxBuildComputerOps, costIc, yieldsComputers, buildComputerOps)
        g_currentState.integratedCircuits -= buildComputerOps * costIc;
        g_currentState.computers += buildComputerOps * yieldsComputers;
    }

    for (var i = 0; i < g_speedUp; i++) {
        if (isResearched('R_COLLEGE_GRANTS_ADULTS') && g_currentState.labs > 200) {
            // research labs => unemployment
            const unemployedPerSecond = lerp1(g_currentState.labs, 200, 20000, 200, 200000) + lerp2(g_currentState.labs, 200, 22000, 200, 1000000);
            g_currentState.unemployment += unemployedPerSecond;
        }
            
        if (true) { // research lab => research;
            var languageUpgradeMultiplier = researchReward("R_LANGUAGE_", [1.1, 1.2, 1.3, 1.4, 1.5], 1);
            var icUpgradeMultiplier = researchReward("R_INTEGRATED_CIRCUITS_", 
                [2, 5, 10, 20, 50, 100, 500, 1500, 3000, 5000, // to IC_10
                 8000, 13000, 20000, 26000, 34000, 45000
                ], 1);
            var gpuPower = researchReward('R_GPU_', [1.0, 1.05, 1.1, 1.2], 1);
            
            var mouseMultiplier = isResearched('R_MOUSE') ? 1.1 : 1;
    
            var dresearchbase = g_currentState.labs * backgroundIntervalSeconds * ((icUpgradeMultiplier * mouseMultiplier) ** gpuPower);
            var percentToReeducation = (~~(g_researchVsReeducationSlider.val()) / 100);
            
            var dresearchspent = Math.min(2 * dresearchbase * percentToReeducation, g_currentState.research)
    
            g_currentState.research += dresearchbase - dresearchspent;
            g_currentState.researchBuilt += dresearchbase - dresearchspent;
            
            var dunemploymentScalingFactor = isResearched('R_COLLEGE_GRANTS_ADULTS') ? 5000 : 1;
            var dunemployment = Math.min(Math.max(1.0 * dunemploymentScalingFactor * Math.log10(dresearchspent + 2), 0), g_currentState.unemployment);
            dunemployment = Math.min(dunemployment, 10 * billion - g_currentState.unemployedAndEducated - g_currentState.unemployedAndEducated);
            g_currentState.unemployment = Math.max(g_currentState.unemployment - dunemployment, 0);
            if (isResearched('R_COLLEGE_GRANTS_ADULTS')) {
                g_currentState.unemployedAndEducated += dunemployment;
            }
        }
        
        if (g_currentState.unemployment > 0 && !isResearched('R_COLLEGE_GRANTS_ADULTS')) {
            g_currentState.unemployment -= 0.1 * Math.pow(g_currentState.unemployment + 1, 0.5) * backgroundIntervalSeconds;
            g_currentState.unemployment = clamp(g_currentState.unemployment, 0, Infinity);
        }

        var unemploymentTooHighThreshold = researchReward('R_WELFARE_', [Welfare1Threshold, Welfare2Threshold, Welfare3Threshold, Welfare4Threshold], 10 * thousand);
        var unemploymentTooLowThreshold = unemploymentTooHighThreshold * 0.75;

        if (g_currentState.unemployment > unemploymentTooHighThreshold) {
            let popularityLost = computePopularityDeltaScale(g_currentState, 0.03) * backgroundIntervalSeconds;
            g_currentState.popularity -= popularityLost;
            g_currentState.popularityLostToUnemployment += popularityLost;
        }

        if (g_currentState.unemployment < unemploymentTooLowThreshold) {
            let popularityRecovered = computePopularityDeltaScale(g_currentState, 0.005) * backgroundIntervalSeconds;
            popularityRecovered = Math.min(
                popularityRecovered,
            g_currentState.popularityLostToUnemployment);

            g_currentState.popularity += popularityRecovered;
            g_currentState.popularityLostToUnemployment -= popularityRecovered;
        }
    }

    // if (isResearched("R_ACCEPT_SURVEILLANCE") || isResearched("R_REJECT_SURVEILLANCE")) {
    //     acceptSurveillance.button.remove();
    //     rejectSurveillance.button.remove();
    // }

    updateInterface(true);

    setTimeout(backgroundTick, backgroundIntervalSeconds * 1000);
}


function main() {
    setupInterface();
    updateInterface(true);
    backgroundTick();
}

window.onload = main;
window.onkeydown = e => {
    if (e.key === "F7") {
        // Right before accepting surveillance (~200k ICs built)
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":8120.616000000094,"computersBuilt":1354,"factories":19,"factoriesBuilt":19,"factoriesBuiltLastTime":1528184971802,"labs":16,"labsBuilt":16,"research":32576.200000000055,"researchBuilt":128826.19999999963,"integratedCircuits":0,"integratedCircuitsBuilt":117314.07999999894,"popularity":67.66090925973637,"popularityLostToUnemployment":0,"unemployment":1.058756466984667e-16,"unemployedAndEducated":0,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054, 'surveillanceEnabled': -1};
    }
    if (e.key === "F6") {
        for (let x of $(".notification-template")) {
            showNotification(x.id)
        }
    }
    if (e.key === "F10") {
        // Right before GPU IV purchase.
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":191464420.55200005,"computersBuilt":1354,"factories":65,"factoriesBuilt":65, "factoryFactories":0, "factoryFactoriesBuilt":0, "factoriesBuiltLastTime":1528184971802,"labs":121,"labsBuilt":121,"research":162702750.94417468,"researchBuilt":355700000.94416016,"integratedCircuits":441468000,"integratedCircuitsBuilt":10890250078.76,"popularity":306.38634723621254,"popularityLostToUnemployment":0,"unemployment":0,"unemployedAndEducated":0,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === "q") {
        // Right before ML robots
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":958177967995.0524,"computersBuilt":1354,"factories":98,"factoriesBuilt":98, "factoryFactories":0, "factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":182,"labsBuilt":182,"research":1644422292.2754986,"researchBuilt":2537419542.2755237,"integratedCircuits":12347571468000,"integratedCircuitsBuilt":66517724742266.26,"popularity":306.3863472362127,"popularityLostToUnemployment":0,"unemployment":223906.81370253224,"unemployedAndEducated":0,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === 'w') {
        // Midgame lull
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":428514.11600000015,"computersBuilt":1354,"factories":38,"factoriesBuilt":38, "factoryFactories":0, "factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":74,"labsBuilt":74,"research":246443.42626313813,"researchBuilt":743693.4262631364,"integratedCircuits":6924444,"integratedCircuitsBuilt":22249195.58,"popularity":67.66090925973644,"popularityLostToUnemployment":0,"unemployment":16495.156066819207,"unemployedAndEducated":0,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528275808585,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528275809795,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528275856851,"R_GPU_2":1,"R_GPU_2_T":1528275858672,"R_REEDUCATION":1,"R_REEDUCATION_T":1528275860864,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528275862218,"R_WELFARE_1":1,"R_WELFARE_1_T":1528275873663,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528275881745,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528275889395};
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === 'e') {
        // Just before welfare 2, when endgame clock starts ticking
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":2338998880563022,"computersBuilt":1354,"factories":117,"factoriesBuilt":117,"factoryFactories":0,"factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":224,"labsBuilt":224,"research":1007762620.5851887,"researchBuilt":2900759870.5852823,"integratedCircuits":2230348577327375,"integratedCircuitsBuilt":29010163847789140,"popularity":175.77930614527287,"popularityLostToUnemployment":130.60704109094007,"unemployment":6907724.369302167,"unemployedAndEducated":0,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988,"R_INDUSTRIAL_ROBOTICS_3":1,"R_INDUSTRIAL_ROBOTICS_3_T":1528309283316}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === 'r') {
        // 1.3% unemployed
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":286010332183237,"computersBuilt":1354,"factories":178,"factoriesBuilt":178, "factoryFactories":0, "factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":1081,"labsBuilt":1081,"research":9227182990.395082,"researchBuilt":13120180240.394535,"integratedCircuits":2851447571468000,"integratedCircuitsBuilt":80687617724742270,"popularity":306.38634723620993,"popularityLostToUnemployment":0,"unemployment":0,"unemployedAndEducated":132991519.50282641,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988,"R_INDUSTRIAL_ROBOTICS_3":1,"R_INDUSTRIAL_ROBOTICS_3_T":1528282411814,"R_WELFARE_2":1,"R_WELFARE_2_T":1528282425367,"R_COLLEGE_GRANTS_ADULTS":1,"R_COLLEGE_GRANTS_ADULTS_T":1528282425809,"R_INTEGRATED_CIRCUITS_10":1,"R_INTEGRATED_CIRCUITS_10_T":1528282522122}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === 't') {
        // 2.1% unemployed, uneducated now climbing
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":31658989126001,"computersBuilt":1354,"factories":176,"factoriesBuilt":176, "factoryFactories":0, "factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":1120,"labsBuilt":1120,"research":9471906131.607687,"researchBuilt":13364903381.607222,"integratedCircuits":525874344905500,"integratedCircuitsBuilt":34949954966929770,"popularity":306.3863472362106,"popularityLostToUnemployment":0,"unemployment":28730915.375719126,"unemployedAndEducated":168795475.9252616,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988,"R_INTEGRATED_CIRCUITS_10":1,"R_INTEGRATED_CIRCUITS_10_T":1528305575003,"R_INDUSTRIAL_ROBOTICS_3":1,"R_INDUSTRIAL_ROBOTICS_3_T":1528305631548,"R_WELFARE_2":1,"R_WELFARE_2_T":1528305681419,"R_COLLEGE_GRANTS_ADULTS":1,"R_COLLEGE_GRANTS_ADULTS_T":1528305772594}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key ===  'y') {
        // 3% unemployed
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":42574875892249,"computersBuilt":1354,"factories":176,"factoriesBuilt":176, "factoryFactories":0, "factoryFactoriesBuilt":0,"factoriesBuiltLastTime":1528184971802,"labs":1518,"labsBuilt":1518,"research":12685466464.24773,"researchBuilt":26578463714.247757,"integratedCircuits":730034344905500,"integratedCircuitsBuilt":39237314966929770,"popularity":306.3863472362106,"popularityLostToUnemployment":0,"unemployment":78776099.75424013,"unemployedAndEducated":238658108.18069246,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988,"R_INTEGRATED_CIRCUITS_10":1,"R_INTEGRATED_CIRCUITS_10_T":1528305575003,"R_INDUSTRIAL_ROBOTICS_3":1,"R_INDUSTRIAL_ROBOTICS_3_T":1528305631548,"R_WELFARE_2":1,"R_WELFARE_2_T":1528305681419,"R_COLLEGE_GRANTS_ADULTS":1,"R_COLLEGE_GRANTS_ADULTS_T":1528305772594,"R_INTEGRATED_CIRCUITS_11":1,"R_INTEGRATED_CIRCUITS_11_T":1528306301088}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }
    if (e.key === 'u') {
        // 12% unemployed
        g_currentState = {"transistors":0,"transistorsBuilt":1579,"computers":361077276563,"computersBuilt":1354,"factories":184,"factoriesBuilt":184,"factoryFactories":1,"factoryFactoriesBuilt":1,"factoriesBuiltLastTime":1528184971802,"labs":11495,"labsBuilt":425,"research":168233563917.7891,"researchBuilt":287126561167.7876,"integratedCircuits":2102579577327376,"integratedCircuitsBuilt":49391639847789140,"popularity":304.66721575054527,"popularityLostToUnemployment":1.7191314856586017,"unemployment":884989218.5913875,"unemployedAndEducated":380461011.31022584,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_BROWSERS":1,"R_BROWSERS_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054,"surveillanceEnabled":1,"R_ACCEPT_SURVEILLANCE":1,"R_ACCEPT_SURVEILLANCE_T":1528264657182,"R_INTEGRATED_CIRCUITS_6":1,"R_INTEGRATED_CIRCUITS_6_T":1528264695329,"R_LANGUAGE_4":1,"R_LANGUAGE_4_T":1528264695921,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528264698240,"R_GPU_2":1,"R_GPU_2_T":1528264791962,"R_GPU_3":1,"R_GPU_3_T":1528264857278,"R_INTEGRATED_CIRCUITS_7":1,"R_INTEGRATED_CIRCUITS_7_T":1528265029490,"R_LANGUAGE_5":1,"R_LANGUAGE_5_T":1528265036086,"E_REEDUCATION_AVAILABLE":1,"E_REEDUCATION_AVAILABLE_T":1528265097502,"R_ML_3":1,"R_ML_3_T":1528265106328,"R_VR":1,"R_VR_T":1528265107990,"R_REEDUCATION":1,"R_REEDUCATION_T":1528265121987,"R_INTEGRATED_CIRCUITS_8":1,"R_INTEGRATED_CIRCUITS_8_T":1528265298805,"R_AR":1,"R_AR_T":1528267217807,"R_IOT":1,"R_IOT_T":1528267238647,"R_ML_4":1,"R_ML_4_T":1528267741828,"R_INTEGRATED_CIRCUITS_9":1,"R_INTEGRATED_CIRCUITS_9_T":1528267820752,"R_GPU_4":1,"R_GPU_4_T":1528271451655,"E_WELFARE_AVAILABLE":1,"E_WELFARE_AVAILABLE_T":1528271458639,"R_WELFARE_1":1,"R_WELFARE_1_T":1528271482778,"R_ML_5":1,"R_ML_5_T":1528271508988,"R_INDUSTRIAL_ROBOTICS_3":1,"R_INDUSTRIAL_ROBOTICS_3_T":1528309283316,"R_WELFARE_2":1,"R_WELFARE_2_T":1528312111418,"R_COLLEGE_GRANTS_ADULTS":1,"R_COLLEGE_GRANTS_ADULTS_T":1528312112343,"R_SPEED_UP_GAME_TIME_1":1,"R_SPEED_UP_GAME_TIME_1_T":1528312113282,"R_INTEGRATED_CIRCUITS_10":1,"R_INTEGRATED_CIRCUITS_10_T":1528312162798,"R_INDUSTRIAL_ROBOTICS_4":1,"R_INDUSTRIAL_ROBOTICS_4_T":1528312204705,"R_INTEGRATED_CIRCUITS_11":1,"R_INTEGRATED_CIRCUITS_11_T":1528312231697,"R_WELFARE_3":1,"R_WELFARE_3_T":1528312307979,"R_INTEGRATED_CIRCUITS_12":1,"R_INTEGRATED_CIRCUITS_12_T":1528312367805}
        g_transistorsVsComputersSlider.val("16")
        g_researchVsReeducationSlider.val("8")
    }

    if (e.key === '+') {
        console.log("20x")
        g_debugSpeedUp = 20;
    }
    if (e.key === '-') {
        console.log("2x")
        g_debugSpeedUp = 2;
    }
}

// end early: {"transistors":0,"transistorsBuilt":12558,"computers":0,"computersBuilt":951,"factories":10,"factoriesBuilt":10,"factoryFactories":0,"factoryFactoriesBuilt":0,"labs":8,"labsBuilt":8,"research":580379.9999999999,"researchBuilt":603630.0000000001,"integratedCircuits":602241,"integratedCircuitsBuilt":597323,"popularity":9.21006380566863,"popularityLostToUnemployment":0,"unemployment":0,"unemployedAndEducated":0,"surveillanceEnabled":-1,"robotTaxFactoryMultiplier":1,"aiWinterPopularityThreshold":8.37930948405285,"activeEvents":{"aiWinter":{"researchMultiplier":2,"researchRate":0.75}},"R_INTEGRATED_CIRCUITS":1,"gameOver":0,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528320049311,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528320061159,"R_INTEGRATED_CIRCUITS_T":1528320131099,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528320131176,"R_ML_1":1,"R_ML_1_T":1528320139632,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528320140565,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528320141199,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528320142135,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528320144479,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528320158521,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528320160656,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528320160939,"E_AI_WINTER":1,"E_AI_WINTER_T":1528320164263,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528320168904,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528320185941,"R_MOUSE":1,"R_MOUSE_T":1528320187349,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528320187379,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528320188320,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528320189252,"R_EMAIL":1,"R_EMAIL_T":1528320190085,"R_CHAT":1,"R_CHAT_T":1528320190942,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528320232937,"R_INDUSTRIAL_ROBOTICS_2":1,"R_INDUSTRIAL_ROBOTICS_2_T":1528320233000}