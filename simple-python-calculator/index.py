import re


class Calculator:
    def __init__(self, expression):
        self.expression = expression
        self.vals = []
        self.ops = []

        if not self.is_valid():
            raise ValueError("Invalid expression")

    def split_str(self):
        return re.findall(r"\d+\.\d+|\d+|[+\-*/()]", self.expression)

    def priority(self, op):
        if op in ("+", "-"):
            return 1
        if op in ("*", "/"):
            return 2
        return 0

    def eval_op(self):
        op = self.ops.pop()
        rhs = self.vals.pop()
        lhs = self.vals.pop()

        match op:
            case "+":
                self.vals.append(lhs + rhs)
            case "-":
                self.vals.append(lhs - rhs)
            case "*":
                self.vals.append(lhs * rhs)
            case "/":
                self.vals.append(lhs / rhs)

    def is_valid(self):
        if not re.fullmatch(r"[0-9+\-*/().\s]+", self.expression):
            return False

        balance = 0  # counter of brackets
        prev_char = ""
        for char in self.expression:
            if char == "(":
                balance += 1
            elif char == ")":
                balance -= 1
                if balance < 0:
                    return False

            if char in "+-*/" and prev_char in "+-*/(":  # check if ops used correctly
                return False

            prev_char = char

        if balance != 0:
            return False

        if self.expression[-1] in "+-*/":
            return False

        return True

    def evaluate(self):
        chars = self.split_str()

        for char in chars:
            if char.isdigit() or re.match(r"\d+\.\d+", char):  # check numbers
                self.vals.append(float(char))
            elif char == "(":
                self.ops.append(char)
            elif char == ")":
                while self.ops and self.ops[-1] != "(":
                    self.eval_op()
                self.ops.pop()  # remove (
            else:  # operators
                while (
                    self.ops
                    and self.ops[-1] != "("
                    and self.priority(self.ops[-1]) >= self.priority(char)
                ):
                    self.eval_op()
                self.ops.append(char)

        while self.ops:
            self.eval_op()

        return self.vals[0]


def handler(event, context):
    expression = event.get("queryStringParameters", {}).get("expression", "")
    try:
        calc = Calculator(expression)
        result = calc.evaluate()
        return {
            "statusCode": 200,
            "body": str(result),
        }
    except ValueError as e:
        return {
            "statusCode": 400,
            "body": str(e),
        }