from typing import Annotated
from pydantic import BaseModel, Field
from ocel.ocel_wrapper import OCELWrapper
from plugins import BasePlugin, plugin_metadata, plugin_method
from plugins.base import OCELAnnotation


class GreetInput(BaseModel):
    name: str = Field(
        ...,
        description="The name of the person",
    )
    ocel_id: str = Field("en", description="Language code")


class GreetOutput(BaseModel):
    message: str


@plugin_metadata(name="GreetingPlugin", version="1.0", description="Greets people")
class GreetingPlugin(BasePlugin):
    @plugin_method(description="Say hello", tags=["greet"])
    def greet(
        self,
        input: GreetInput,
        ocel: Annotated[OCELWrapper, OCELAnnotation(description="Als", label="as")],
    ) -> GreetOutput:
        greetings = {
            "en": "Hello",
            "es": "Hola",
            "fr": "Bonjour",
            "de": "Hallo",
        }
        word = greetings.get(input.language.lower(), "Hello")
        return GreetOutput(message=f"{word}, {input.name}!")
