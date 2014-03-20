module TeddyMocks {

    export interface IState1<T> {
        stubs<U>(stubFunc: (t: T) => U): IState2<T, U>;
        assertsThat<U>(assertFunc: (t: T) => U): IState3<T, U>;
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

        public stubs<U>(stubFunc: (t: T) => U): IState2<T, U> {            

            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.isStubbing = true;

            try {
                stubFunc(this.object);
                return new State2<T, U>(dynamicObject.lastExpectation);

            } finally {
                dynamicObject.isStubbing = false;

            }
        }

        public assertsThat<U>(assertFunc: (t: T) => U): IState3<T, U> {

            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.isAsserting = true;

            try {
                assertFunc(this.object);
                return new State3<T, U>(dynamicObject.lastExpectation);

            } finally {
                dynamicObject.isAsserting = false;

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

    class State2<T, U> implements IState2<T, U> {
        constructor(public expectation: Expectation) {
        }

        public andReturns(u: U) {
            this.expectation.returnValue = u;
        }

        public withCallback(callback: (arguments: IArguments) => U): void {
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

        public usingCallback(callback: (arguments: IArguments) => boolean): boolean {
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
                var property = basePrototype[parameter];
                if (typeof property === "function") {
                    functionNames.push(parameter);
                }
            }

            functionNames.forEach((name: string) => {
                this[name] = function () {                    
                    if (this.isStubbing) {
                        this.lastExpectation = new Expectation(arguments);
                        this.expectations[name] = this.lastExpectation;

                    } else {
                        var expectation = <Expectation>this.expectations[name];
                        if (this.isAsserting) {
                            this.lastExpectation = expectation;
                            if (this.lastExpectation) {
                                this.lastExpectation.match(arguments);
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
            superType.apply(this, arguments);
        }
    }

    class Expectation {

        public returnValue: any;
        public callback: (arguments: IArguments) => any;
        public recordedCalls: Array<IArguments>
        public matchCount: number;

        constructor(public expectedArguments?: IArguments) {
            this.recordedCalls = [];
        }

        public matchStubbedArguments(): boolean {
            return this.expectedArguments && this.countMatchedMethods(this.expectedArguments) === 1;
        }

        public match(expectedArguments: IArguments): void {
            this.matchCount = this.countMatchedMethods(expectedArguments);
        }

        public record(arguments: IArguments): void {
            this.recordedCalls.push(arguments);
        }

        public getReturnValue(arguments: IArguments): any {
            return this.callback
                ? this.callback(arguments)
                : this.returnValue;
        }

        private countMatchedMethods(expectedArguments: IArguments): number {

            var count = 0;
            this.recordedCalls.forEach((actualArguments: IArguments) => {
                if (expectedArguments.length === actualArguments.length) {
                    var argumentsMatch = true;
                    for (var i = 0; i < expectedArguments.length && argumentsMatch; i++) {
                        argumentsMatch = (expectedArguments[i] === actualArguments[i]);
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

