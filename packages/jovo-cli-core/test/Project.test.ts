import {  Project } from '../src';


describe('Project.ts', () => {

	describe('getConfig', () => {

		const getConfigTests = [
			{
				config: {
					endpoint: 'endpoint_default',
				},
				tests: [
					{
						description: 'should use the root level data when not stage is set',
						input: {
							stage: undefined,
						},
						result: {
							endpoint: 'endpoint_default',
						}
					},
					{
						description: 'should use the root level when stage gets requested but no data got defined',
						input: {
							stage: 'dev',
						},
						result: {
							endpoint: 'endpoint_default',
						}
					}
				]
			},
			{
				config: {
					endpoint: 'endpoint_default',
					stages: {
						dev: {
							endpoint: 'endpoint_dev',
						}
					}
				},
				tests: [
					{
						description: 'should use the root level data when not stage is set but other stages are defined',
						input: {
							stage: undefined,
						},
						result: {
							endpoint: 'endpoint_default',
							stages: {
								dev: {
									endpoint: 'endpoint_dev',
								}
							}
						}
					},
					{
						description: 'should use the stage data when stage is defined and requested',
						input: {
							stage: 'dev',
						},
						result: {
							endpoint: 'endpoint_dev',
							stages: {
								dev: {
									endpoint: 'endpoint_dev',
								}
							}
						}
					}
				]
			},
			{
				config: {
					defaultStage: 'dev',
					endpoint: 'endpoint_default',
					stages: {
						dev: {
							endpoint: 'endpoint_dev',
						},
						production: {
							endpoint: 'endpoint_production',
						}
					}
				},
				tests: [
					{
						description: 'should use the defaultStage data when no stage got requested',
						input: {
							stage: undefined,
						},
						result: {
							defaultStage: 'dev',
							endpoint: 'endpoint_dev',
							stages: {
								dev: {
									endpoint: 'endpoint_dev',
								},
								production: {
									endpoint: 'endpoint_production',
								}
							}
						}
					},
					{
						description: 'should use the stage data when stage is defined even when defaultStage set',
						input: {
							stage: 'production',
						},
						result: {
							defaultStage: 'dev',
							endpoint: 'endpoint_production',
							stages: {
								dev: {
									endpoint: 'endpoint_dev',
								},
								production: {
									endpoint: 'endpoint_production',
								}
							}
						}
					}
				]
			},
			{
				config: {
					endpoint: 'endpoint_default',
					stages: {
						production: {
							endpoint: 'endpoint_production',
							googleAction: {
								dialogflow: {
									endpoint: 'endpoint_dialogFlow_production',
								}
							}
						},
					},
					googleAction: {
						nlu: 'dialogflow',
						dialogflow: {
							endpoint: 'endpoint_dialogFlow_default',
							projectId: 'projectId_dialogFlow_default',
						}
					},
				},
				tests: [
					{
						description: 'should use the root level data when no stage got requested with deep level data',
						input: {
							stage: undefined,
						},
						result: {
							endpoint: 'endpoint_default',
							stages: {
								production: {
									endpoint: 'endpoint_production',
									googleAction: {
										dialogflow: {
											endpoint: 'endpoint_dialogFlow_production',
										}
									}
								},
							},
							googleAction: {
								nlu: 'dialogflow',
								dialogflow: {
									endpoint: 'endpoint_dialogFlow_default',
									projectId: 'projectId_dialogFlow_default',
								}
							},
						}
					},
					{
						description: 'should use the root level data merged with requested stage data with deep level data',
						input: {
							stage: 'production',
						},
						result: {
							endpoint: 'endpoint_production',
							stages: {
								production: {
									endpoint: 'endpoint_production',
									googleAction: {
										dialogflow: {
											endpoint: 'endpoint_dialogFlow_production',
										}
									}
								},
							},
							googleAction: {
								nlu: 'dialogflow',
								dialogflow: {
									endpoint: 'endpoint_dialogFlow_production',
									projectId: 'projectId_dialogFlow_default',
								}
							},
						}
					},
				]
			}
		];

		getConfigTests.forEach((testData) => {
			const project = new Project();
			jest.spyOn(project, "getConfigContent").mockImplementation(() => {
				return testData.config;
			});
			((project) => {
				testData.tests.forEach((configTestData) => {
					test(configTestData.description, () => {
						expect(project.getConfig(configTestData.input.stage)).toEqual(configTestData.result);
					});
				});
			})(project);
		});


	});

});
