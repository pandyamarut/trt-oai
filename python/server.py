import asyncio

import click
from transformers import AutoTokenizer

from tensorrt_llm import LLM, BuildConfig
from tensorrt_llm import LlmArgs
from serve import OpenAIServer
from dotenv import load_dotenv



from huggingface_hub import login
import os

def hf_login():
    load_dotenv()
    # Get the Hugging Face token    
    huggingface_token = os.getenv("HF_TOKEN")

    if huggingface_token:
        print("Hugging Face token found. Logging in...")
        login(huggingface_token)
    else:
        print("No Hugging Face token found. Skipping login.")



@click.command("trtllm-serve")
@click.argument("model", type=str)
@click.option("--tokenizer",
              type=str,
              default=None,
              help="Path | Name of the tokenizer."
              "Specify this value only if using TensorRT engine as model.")
@click.option("--host",
              type=str,
              default="0.0.0.0",
              help="Hostname of the server.")
@click.option("--port", type=int, default=8000, help="Port of the server.")
@click.option("--max_beam_width",
              type=int,
              default=BuildConfig.max_beam_width,
              help="Maximum number of beams for beam search decoding.")
@click.option("--max_batch_size",
              type=int,
              default=BuildConfig.max_batch_size,
              help="Maximum number of requests that the engine can schedule.")
@click.option(
    "--max_num_tokens",
    type=int,
    default=BuildConfig.max_num_tokens,
    help=
    "Maximum number of batched input tokens after padding is removed in each batch."
)
@click.option(
    "--max_seq_len",
    type=int,
    default=BuildConfig.max_seq_len,
    help="Maximum total length of one request, including prompt and outputs. "
    "If unspecified, the value is deduced from the model config.")
@click.option("--tp_size", type=int, default=1, help='Tensor parallelism size.')
@click.option("--pp_size",
              type=int,
              default=1,
              help='Pipeline parallelism size.')
@click.option("--kv_cache_free_gpu_memory_fraction",
              type=float,
              default=0.9,
              help="Free GPU memory fraction reserved for KV Cache, "
              "after allocating model weights and buffers.")
@click.option("--trust_remote_code",
              is_flag=True,
              default=False,
              help="Flag for HF transformers.")
def main(model: str, tokenizer: str, host: str, port: int, max_beam_width: int,
         max_batch_size: int, max_num_tokens: int, max_seq_len: int,
         tp_size: int, pp_size: int, kv_cache_free_gpu_memory_fraction: float,
         trust_remote_code: bool):
         
    """Running an OpenAI API compatible server

    MODEL: model name | HF checkpoint path | TensorRT engine path
    """

    ## Add HF_LOGIN
    hf_login()

    build_config = BuildConfig(max_batch_size=max_batch_size,
                               max_num_tokens=max_num_tokens,
                               max_beam_width=max_beam_width,
                               max_seq_len=max_seq_len)

    # kv_cache_config = KvCacheConfig(
    #     free_gpu_memory_fraction=kv_cache_free_gpu_memory_fraction)

    llm_args = LlmArgs.from_kwargs(
        model=model,
        tokenizer=tokenizer,
        tensor_parallel_size=tp_size,
        pipeline_parallel_size=pp_size,
        trust_remote_code=trust_remote_code,
        build_config=build_config,
        # kv_cache_config=kv_cache_config,
    )

    llm = LLM(model=model,
        tokenizer=tokenizer,
        tensor_parallel_size=tp_size,
        pipeline_parallel_size=pp_size,
        trust_remote_code=trust_remote_code,
        build_config=build_config)

    hf_tokenizer = AutoTokenizer.from_pretrained(tokenizer or model)

    server = OpenAIServer(llm=llm, model=model, hf_tokenizer=hf_tokenizer)

    asyncio.run(server(host, port))


if __name__ == "__main__":
    main()