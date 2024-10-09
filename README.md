# Serverless Functions Collection
This repository contains a collection of serverless functions that can be deployed on Yandex Cloud. Although I will no longer update the code, feel free to use or adapt it for your needs.

## Table of Contents
- [Serverless Functions Collection](#serverless-functions-collection)
- [Discord Serverless Bot](#discord-serverless-bot)
- [GitHub Profile Dynamic SVG Statistics](#github-profile-dynamic-svg-statistics)
- [Simple Python Calculator](#simple-python-calculator)
- [Sky COTL Eruption Discord Webhook](#sky-cotl-eruption-discord-webhook)

## Discord Serverless Bot
A simple Discord bot hosted serverlessly with the following features:
- Command handler
- Request verification
- Integration with AmariBot and UnbelievaBoat APIs

### Environment Variables:
- `public_key`: Discord bot's public key
- `ds_tkn`: Discord bot token
- `ab_tkn`: AmariBot API token
- `ub_tkn`: UnbelievaBoat API token

### Gateway Configuration:
To deploy, configure the Yandex Cloud API Gateway with the following YAML file:
```yml
openapi: 3.0.0
info:
  title: API
  version: 1.0.0
servers:
- url: https://<your-api-gateway-url>.apigw.yandexcloud.net
paths:
  /interactions:
    parameters:
      - name: integration
        in: query
        description: Async request indicator
        required: false
        schema:
          type: string
          default: async
    post:
      x-yc-apigateway-integration:
        payload_format_version: '0.1'
        function_id: PUT_YANDEX_FUNCTION_ID_HERE
        tag: $latest
        type: cloud_functions
        service_account_id: PUT_YANDEX_SERVICE_ACCOUNT_ID_HERE
```

## GitHub Profile Dynamic SVG Statistics
<img align="right" width="200" title="preview" alt="preview" src="https://github.com/zippw/yandex-cloud-functions/blob/main/github-profile-dynamic-svg-statistics-main/preview.gif?raw=true"/>

This function dynamically generates SVG stats for your GitHub profile, displaying various metrics like repository activity.

**Powered by Yandex Managed Service for YDB**

### Environment Variables:
- `ydb_endpoint`: Yandex Document API endpoint
- `gh_tkn`: [GitHub personal access token](https://github.com/settings/tokens)

> **TIP**: To scan private repositories, enable the "repo" scope when creating the GitHub token.

### Features:
- Customizable language colors

## Simple Python Calculator
A basic API for arithmetic operations. (as my school homework)

### Features:
- Basic operations like addition, subtraction, multiplication, and division.
- Simple and easy to integrate with any front-end or API consumer.

## Sky COTL Eruption Discord Webhook
A webhook function that sends reminders for Sky: Children of the Light shard eruptions to a Discord channel.

### Trigger:
This function is triggered via a cron schedule:
```
cron: 0,28,38,48 0,9,15,21,10,16,22,14,20,2 ? * *
```
> *Note*: The schedule may not account for daylight saving time, so you might need to adjust accordingly during winter.

### Environment Variables:
- `wh`: Your Discord webhook URL
- `sky_eruption_role_id`: Role ID to ping for strong eruptions

**Special Thanks**: A shout-out to the [Reddit community](https://www.reddit.com/r/SkyGame/comments/1079lfx/calendar_for_shard_eruptions_2023/) for providing details about shard eruption timings.
