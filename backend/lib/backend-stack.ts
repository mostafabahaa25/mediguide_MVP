import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM policy for Bedrock access
    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'],
    });

    // 1. Define the Lambda Function that will process prescriptions
    const scanFunction = new lambda.Function(this, 'ScanPrescriptionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });
    scanFunction.addToRolePolicy(bedrockPolicy);

    // 2. Define the Lambda Function that will analyze medications
    const analyzeFunction = new lambda.Function(this, 'AnalyzeMedicationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'analyzer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });
    analyzeFunction.addToRolePolicy(bedrockPolicy);

    
    // 3. Define the API Gateway endpoint
    const api = new apigw.RestApi(this, 'MedGuideApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type'],
      }
    });

    // 4. Create the '/scan-prescription' resource and integrate it with the Lambda
    const scanResource = api.root.addResource('scan-prescription');
    scanResource.addMethod('POST', new apigw.LambdaIntegration(scanFunction), {
        apiKeyRequired: false,
      });

    // 5. Create the '/analyze' resource and integrate it with the new Lambda
    const analyzeResource = api.root.addResource('analyze');
    analyzeResource.addMethod('POST', new apigw.LambdaIntegration(analyzeFunction), {
        apiKeyRequired: false,
      });

    // 6. Output the API endpoint URLs after deployment
    new cdk.CfnOutput(this, 'ScanApiUrl', {
      value: api.urlForPath(scanResource.path),
    });
    new cdk.CfnOutput(this, 'AnalyzeApiUrl', {
      value: api.urlForPath(analyzeResource.path),
    });

    // IAM policy for Polly access
    const pollyPolicy = new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*'],
    });

    // Define the Lambda Function that will speak text
    const speakerFunction = new lambda.Function(this, 'SpeakerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'speaker.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });
    speakerFunction.addToRolePolicy(pollyPolicy);

    // Add Function URL (simpler than API Gateway for binary responses)
    const functionUrl = speakerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type'],
      },
    });

    // Output the Function URL
    new cdk.CfnOutput(this, 'SpeakFunctionUrl', {
      value: functionUrl.url,
    });


  }
}