// ARC Template Example
// This is an ARC language test file

// Function definition
def greet(name)
  if name then
    println("Hello, " + name)
  else
    println("Hello, World")
  end
end

// Class definition
class Person
  def initialize(name, age)
    @name = name
    @age = age
  end

  def get_name
    @name
  end

  def get_age
    @age
  end
end

// Trait definition
trait Drawable
  def draw
    println("Drawing...")
  end
end

// Loop example
loop i in [1, 2, 3, 4, 5]
  println(i)
end

// While loop
while x < 10
  println(x)
  x = x + 1
end

// Match expression
match status
  case "active" -> println("Status is active")
  case "inactive" -> println("Status is inactive")
  case _ -> println("Unknown status")
end

// Type declaration
type Age = number
type Name = string

// Directive example
@decorator
def special_function
  println("This is decorated")
end

// Nested structure
class Animal
  def speak
    println("Animal speaks")
  end

  class Dog
    def speak
      println("Dog barks")
    end
  end
end
