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
        wasCalled(times?: number): boolean;
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
                return new State2<T, U>(dynamicObject, dynamicObject.lastExpectation);

            } finally {
                dynamicObject.isStubbing = false;

            }
        }

        public assertsThat<U>(assertFunc: (t: T) => U): IState3<T, U> {
            return null;
        }

        public clear(): void {
            var dynamicObject = <DynamicObject><any>this.object;
            dynamicObject.expectations = {};
        }
    }

    class State2<T, U> implements IState2<T, U> {
        constructor(public dynamicObject: DynamicObject, public expectation: Expectation) {
        }

        public andReturns(u: U) {
            this.expectation.returnValue = u;
        }

        public withCallback(callback: (arguments: IArguments) => U): void {
            this.expectation.callback = callback;
        }
    }

    class State3<T, U> implements IState3<T, U> {
        constructor() {
        }
        public wasCalled(times?: number): boolean {
            return false;
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
                        this.lastExpectation = new Expectation(name, arguments);
                        this.expectations[name] = this.lastExpectation;

                    } else if (this.isAsserting) {
                        // to do: assert the method here!

                    } else {
                        var expectation = this.expectations[name];
                        return expectation
                            ? expectation.getReturnValue(arguments)
                            : basePrototype[name].apply(this, arguments);

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

        constructor(public methodName: string, public arguments: IArguments) {
        }

        public getReturnValue(arguments: IArguments): any {
            return this.callback
                ? this.callback(arguments)
                : this.returnValue;
        }
    }
}

