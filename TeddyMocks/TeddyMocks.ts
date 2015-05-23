module TeddyMocks {

    export interface IState1<T> {
        stubs<U>(stubFunc: (t: T) => U, validateArguments?: boolean): IState2<T, U>;
        assertsThat<U>(assertFunc: (t: T) => U, validateArguments?: boolean): IState3<T, U>;
    }

    export interface IState2<T, U> {
        andReturns(u: U);
        withCallback(callback: (arguments: IArguments) => U);
    }

    export interface IState3<T, U> {
        wasCalled(): boolean;
        wasCalledTwoTimes(): boolean;
        wasCalledThreeTimes(): boolean;
        wasCalledFourTimes(): boolean;
        wasCalledFiveTimes(): boolean;
        wasCalledAnyNumberOfTimes(): boolean;
        wasCalledXTimes(x: number): boolean;
        usingCallback(validatingCallback: (arguments: IArguments) => boolean);
    }

    interface IReplacedGlobal {
        container: Object;
        objectName: string;
        originalFunction: Function;
    }    

    // This is the stub class that users will ... use to stub things with the API:
    export class Stub<T> implements IState1<T> {

        public object: T;

        constructor(type: Function) {

            if (typeof type !== "function") {
                throw "type must be an function";
            }            

            // to do: figure out how to make these object polymorphic (if it applies)
            this.object = <T><any>(new DynamicObject(type));
        }

        public stubs<U>(stubFunc: (t: T) => U, validateArguments?: boolean): IState2<T, U> {            

            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.isStubbing = true;
            dynamicObject.isValidatingArguments = (validateArguments !== undefined) ? validateArguments  : true;

            try {
                stubFunc(this.object);
                return new State2<T, U>(dynamicObject.lastExpectation);

            } finally {
                dynamicObject.isStubbing = false;
                dynamicObject.isValidatingArguments = false;

            }
        }

        public assertsThat<U>(assertFunc: (t: T) => U, validateArguments?: boolean): IState3<T, U> {

            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.isAsserting = true;
            dynamicObject.isValidatingArguments = (validateArguments !== undefined) ? validateArguments : true;

            try {
                assertFunc(this.object);
                return new State3<T, U>(dynamicObject.lastExpectation);

            } finally {
                dynamicObject.isAsserting = false;
                dynamicObject.isValidatingArguments = false;

            }
        }

        public clearStubbedMethods(): void {
            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.expectations = {};
        }

        public clearRecordedMethods(): void {
            var dynamicObject = <DynamicObject><any>this.object;
            for (var expectedMethodName in dynamicObject.expectations) {
                var expectation = <Expectation>dynamicObject.expectations[expectedMethodName];
                expectation.recordedCalls = []; // Erase all recorded methods:
            }
        }
    }

    // This class allows global objects to be stubbed and later reverted for future tests.
    export class GlobalOverride {

        static isInGlobalScope: boolean;
        static replacedGlobals: Array<IReplacedGlobal>;

        static createScope(scopeFunc: () => void): void {
            this.isInGlobalScope = true;
            this.replacedGlobals = [];
            try {
                scopeFunc();
            } finally {
                // Make sure we always revert state:
                this.isInGlobalScope = false;
                this.replacedGlobals.forEach(global => global.container[global.objectName] = global.originalFunction);
            }
        }

        static replace(functionName: string, container: any, replacement: Function): void {

            if (!this.isInGlobalScope) {
                throw "Must be in a global scope in order to replace global functions";
            }

            var originalFunction = container[functionName];
            container[functionName] = replacement;
            this.replacedGlobals.push({
                container: container,
                objectName: functionName,
                originalFunction: originalFunction
            });
        }
    }

    export class GlobalStub<T> extends Stub<T> {

        constructor(objectName: string, container?: Object) {

            if (!GlobalOverride.isInGlobalScope) {
                throw "Must be in a global scope in order to use GlobalStubs";
            }

            container = container || window;
            var replacedGlobal: IReplacedGlobal = {
                container: container,
                objectName: objectName,
                originalFunction: container[objectName]
            };

            super(replacedGlobal.originalFunction);

            var replacementObject = eval("(function() { function " + objectName + "() { } return " + objectName + "; })()");
            replacementObject.prototype = replacedGlobal.originalFunction.prototype;

            // For ever method that we stubbed in the base classes DynamicObject, create an override on the replacement object that calls 
            // back to this stub. We need to do this because the global replacement object will be recreated
            // every time it is new'ed up, but it needs to map back to the original implementation in DynamicObject:
            var overloadedFunctions: Array<string> = [];
            for (var propertyName in this.object) {
                var property = this.object[propertyName];
                if (typeof property === "function") {
                    overloadedFunctions.push(propertyName);
                }
            }

            overloadedFunctions.forEach(function(name: string) {
                replacementObject.prototype[name] = function() {
                    (<Function>this.object[name]).apply(this.object, arguments);
                }
            });

            replacedGlobal.container[replacedGlobal.objectName] = replacementObject;
            GlobalOverride.replacedGlobals.push(replacedGlobal);
        }
    }

    class State2<T, U> implements IState2<T, U> {
        constructor(public expectation: Expectation) {
        }

        public andReturns(u: U) {
            this.expectation.returnValue = u;
        }

        public withCallback(callback: (iarguments: IArguments) => U): void {
            this.expectation.callback = callback;
        }
    }

    class State3<T, U> implements IState3<T, U> {
        constructor(public lastExpectation: Expectation) {
        }

        public wasCalled(): boolean {
            return this.wasCalledInternal(1);
        }

        public wasCalledTwoTimes(): boolean {
            return this.wasCalledInternal(2);
        }

        public wasCalledThreeTimes(): boolean {
            return this.wasCalledInternal(3);
        }

        public wasCalledFourTimes(): boolean {
            return this.wasCalledInternal(4);
        }

        public wasCalledFiveTimes(): boolean {
            return this.wasCalledInternal(5);
        }

        public wasCalledAnyNumberOfTimes(): boolean {
            return this.wasCalledInternal(-1);
        }

        public wasCalledXTimes(x: number): boolean {
            return this.wasCalledInternal(x);
        }

        public usingCallback(callback: (iarguments: IArguments) => boolean): boolean {
            return this.lastExpectation.recordedCalls.some(callback);
        }

        private wasCalledInternal(times: number): boolean {
            return this.lastExpectation
                ? (times === -1) ? this.lastExpectation.matchCount > 0 : this.lastExpectation.matchCount === times
                : false;
        }
    }

    class DynamicObject {

        public isStubbing: boolean;
        public isAsserting: boolean;
        public isValidatingArguments: boolean;
        public expectations: any = {};        
        public lastExpectation: Expectation;

        constructor(public superType: Function) {
            
            var basePrototype = superType.prototype;

            // Copy all functions on the base type into an array so 
            // we can do the functionality below. Note - if we don't copy these strings
            // and just iterate through the strings in basePrototype, we will end up
            // mocking only the last function defined on the type:
            var functionNames: Array<string> = [];
            for (var parameter in basePrototype) {
                try {
                    var property = basePrototype[parameter];
                    if (typeof property === "function") {
                        functionNames.push(parameter);
                    }
                } catch (e) {
                    // Some properties are not accessible.
                }
            }

            functionNames.forEach((name: string) => {
                this[name] = function () {                    
                    if (this.isStubbing) {
                        this.lastExpectation = new Expectation(arguments, this.isValidatingArguments);
                        this.expectations[name] = this.lastExpectation;

                    } else {
                        var expectation = <Expectation>this.expectations[name];
                        if (this.isAsserting) {
                            this.lastExpectation = expectation;
                            if (this.lastExpectation) {
                                this.lastExpectation.match(arguments, this.isValidatingArguments);
                            }

                            return undefined;
                        } else {

                            if (!expectation) {
                                expectation = this.expectations[name] = new Expectation();
                            }

                            expectation.record(arguments);
                            return expectation.matchStubbedArguments()
                                ? expectation.getReturnValue(arguments)
                                : basePrototype[name].apply(this, arguments);
                        }
                    }
                }
            });

            // Call the base constructor:
            try {
                superType.apply(this, arguments);
            } catch (e) {
                // Nothing to do. Chrome does not allow us to call some functions expicitly, they can
                // only be called via new. This only seems to apply to DOM elements and the like, so it 
                // should be harmless to any user-defined class.
            }
        }
    }

    class Expectation {

        public returnValue: any;
        public callback: (iarguments: IArguments) => any;
        public recordedCalls: Array<IArguments>
        public matchCount: number;

        constructor(public expectedArguments?: IArguments, public validateArguments?: boolean) {
            this.recordedCalls = [];
        }

        public matchStubbedArguments(): boolean {
            return this.expectedArguments && this.countMatchedMethods(this.expectedArguments, this.validateArguments) === 1;
        }

        public match(expectedArguments: IArguments, validateArguments: boolean): void {
            this.matchCount = this.countMatchedMethods(expectedArguments, validateArguments);
        }

        public record(iarguments: IArguments): void {
            this.recordedCalls.push(iarguments);
        }

        public getReturnValue(iarguments: IArguments): any {
            return this.callback
                ? this.callback(iarguments)
                : this.returnValue;
        }

        private countMatchedMethods(expectedArguments: IArguments, validateArguments: boolean): number {

            var count = 0;
            this.recordedCalls.forEach((actualArguments: IArguments) => {
                if (expectedArguments.length === actualArguments.length) {

                    var argumentsMatch = true;
                    if (validateArguments) {
                        for (var i = 0; i < expectedArguments.length && argumentsMatch; i++) {
                            argumentsMatch = (expectedArguments[i] === actualArguments[i]);
                        }
                    }

                    if (argumentsMatch) {
                        count++;
                    }
                }
            });

            return count;
        }
    }
}

