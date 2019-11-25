function generateConfig(context, amplifyConfig) {
  const metadata = context.amplify.getProjectMeta();
  amplifyConfig = amplifyConfig || {
    UserAgent: 'aws-amplify-cli/2.0',
    Version: '1.0',
  };
  constructAnalytics(metadata, amplifyConfig);
  constructApi(metadata, amplifyConfig);
  constructPredictions(metadata, amplifyConfig);
  constructStorage(metadata, amplifyConfig);

  return amplifyConfig;
}

function constructAnalytics(metadata, amplifyConfig) {
  const categoryName = 'analytics';
  const pluginName = 'awsPinpointAnalyticsPlugin';
  if (metadata[categoryName] && Object.keys(metadata[categoryName]).length > 0) {
    const r = Object.keys(metadata[categoryName])[0]; // only one resource in analytics
    const resourceMeta = metadata[categoryName][r];
    if (resourceMeta.output) {
      amplifyConfig[categoryName] = {};
      amplifyConfig[categoryName].plugins = {};
      amplifyConfig[categoryName].plugins[pluginName] = {};

      amplifyConfig[categoryName].plugins[pluginName].pinpointAnalytics = {
        appId: resourceMeta.output.Id,
        region: resourceMeta.output.Region,
      };
      amplifyConfig[categoryName].plugins[pluginName].pinpointTargeting = {
        region: resourceMeta.output.Region,
      };
    }
  }
}

function constructApi(metadata, amplifyConfig) {
  const categoryName = 'api';
  const pluginName = 'awsAPIPlugin';
  const region = metadata.providers.awscloudformation.Region;
  if (metadata[categoryName]) {
    Object.keys(metadata[categoryName]).forEach(r => {
      const resourceMeta = metadata[categoryName][r];
      if (resourceMeta.output) {
        amplifyConfig[categoryName] = amplifyConfig[categoryName] || {};
        amplifyConfig[categoryName].plugins = amplifyConfig[categoryName].plugins || {};
        amplifyConfig[categoryName].plugins[pluginName] = amplifyConfig[categoryName].plugins[pluginName] || {};

        if (resourceMeta.service === 'AppSync') {
          amplifyConfig[categoryName].plugins[pluginName][r] = {
            endpointType: 'GraphQL',
            endpoint: resourceMeta.output.GraphQLAPIEndpointOutput,
            region,
            authorizationType: resourceMeta.output.authConfig.defaultAuthentication.authenticationType,
            apiKey: resourceMeta.output.GraphQLAPIKeyOutput,
          };
        } else if (resourceMeta.service === 'API Gateway') {
          amplifyConfig[categoryName].plugins[pluginName][r] = {
            endpointType: 'REST',
            endpoint: resourceMeta.output.RootUrl,
            region,
            authorizationType: 'AWS_IAM',
          };
        }
      }
    });
  }
}

function constructPredictions(metadata, amplifyConfig) {
  const categoryName = 'predictions';
  const pluginName = 'awsPredictionsPlugin';
  const region = metadata.providers.awscloudformation.Region;
  if (metadata[categoryName]) {
    Object.keys(metadata[categoryName]).forEach(r => {
      const resourceMeta = metadata[categoryName][r];
      if (resourceMeta.output) {
        amplifyConfig[categoryName] = amplifyConfig[categoryName] || {};
        amplifyConfig[categoryName].plugins = amplifyConfig[categoryName].plugins || {};
        amplifyConfig[categoryName].plugins[pluginName] = amplifyConfig[categoryName].plugins[pluginName] || {};
        amplifyConfig[categoryName].plugins[pluginName].defaultRegion =
          amplifyConfig[categoryName].plugins[pluginName].defaultRegion || region;

        const { serviceGroup, serviceType } = getPredictionsResourceNameAndType(resourceMeta);
        if (serviceGroup && serviceType) {
          amplifyConfig[categoryName].plugins[pluginName][serviceGroup] =
            amplifyConfig[categoryName].plugins[pluginName][serviceGroup] || {};

          let defaultNetworkPolicy = 'auto';
          if (
            amplifyConfig[categoryName].plugins[pluginName][serviceGroup][serviceType] &&
            amplifyConfig[categoryName].plugins[pluginName][serviceGroup][serviceType].defaultNetworkPolicy
          ) {
            // eslint-disable-next-line
            defaultNetworkPolicy = amplifyConfig[categoryName].plugins[pluginName][serviceGroup][serviceType].defaultNetworkPolicy;
          }

          amplifyConfig[categoryName].plugins[pluginName][serviceGroup][serviceType] = resourceMeta.output;
          amplifyConfig[categoryName].plugins[pluginName][serviceGroup][serviceType].defaultNetworkPolicy = defaultNetworkPolicy;
        }
      }
    });
  }
}

function getPredictionsResourceNameAndType(resourceMeta) {
  const result = {};

  if (resourceMeta.identifyType) {
    result.serviceGroup = 'identify';
    result.serviceType = resourceMeta.identifyType;
  } else if (resourceMeta.interpretType) {
    result.serviceGroup = 'interpret';
    result.serviceType = resourceMeta.interpretType;
  } else if (resourceMeta.convertType) {
    result.serviceGroup = 'convert';
    result.serviceType = resourceMeta.convertType;
  } else if (resourceMeta.inferType) {
    result.serviceGroup = 'infer';
    result.serviceType = resourceMeta.inferType;
  }

  return result;
}

function constructStorage(metadata, amplifyConfig) {
  const categoryName = 'storage';
  const s3PluginName = 'awsS3StoragePlugin';
  const dynamoDbPluginName = 'awsDynamoDbStoragePlugin';
  if (metadata[categoryName]) {
    Object.keys(metadata[categoryName]).forEach(r => {
      const resourceMeta = metadata[categoryName][r];
      if (resourceMeta.output) {
        amplifyConfig[categoryName] = amplifyConfig[categoryName] || {};
        amplifyConfig[categoryName].plugins = amplifyConfig[categoryName].plugins || {};
        if (resourceMeta.service === 'S3') {
          let defaultAccessLevel = 'guest';
          if (
            amplifyConfig[categoryName].plugins[s3PluginName] &&
            amplifyConfig[categoryName].plugins[s3PluginName].defaultAccessLevel &&
            (amplifyConfig[categoryName].plugins[s3PluginName].defaultAccessLevel === 'protected' ||
              amplifyConfig[categoryName].plugins[s3PluginName].defaultAccessLevel === 'private')
          ) {
            // eslint-disable-next-line
            defaultAccessLevel = amplifyConfig[categoryName].plugins[s3PluginName].defaultAccessLevel;
          }
          amplifyConfig[categoryName].plugins[s3PluginName] = {
            bucket: resourceMeta.output.BucketName,
            region: resourceMeta.output.Region,
            defaultAccessLevel,
          };
        } else if (resourceMeta.service === 'DynamoDB') {
          amplifyConfig[categoryName].plugins[dynamoDbPluginName] = {};
          Object.keys(metadata[categoryName][r].output).forEach(key => {
            const value = metadata[categoryName][r].output[key];
            key = key[0].toLowerCase() + key.slice(1);
            amplifyConfig[categoryName].plugins[dynamoDbPluginName][key] = value;
          });
        }
      }
    });
  }
}

module.exports = {
  generateConfig,
};