#!/usr/bin/env node

/**
 * Backend Development Validator
 * Validates backend systems for API design, database optimization, and security controls
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

class BackendValidator {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: [],
            notChecked: []
        };
    }

    async validateAPI() {
        console.log('Checking API Design...');
        try {
            // Check OpenAPI/Swagger documentation
            await this.checkAPIDocumentation();
            // Check API endpoints
            await this.checkAPIEndpoints();
            // Check rate limiting
            await this.checkRateLimiting();
        } catch (error) {
            this.results.failed.push('API validation failed: ' + error.message);
        }
    }

    async checkAPIDocumentation() {
        try {
            const swaggerPath = 'src/swagger.yaml';
            if (fs.existsSync(swaggerPath)) {
                const swagger = yaml.load(fs.readFileSync(swaggerPath, 'utf8'));
                this.validateSwaggerSpec(swagger);
            } else {
                this.results.warnings.push('No OpenAPI/Swagger documentation found');
            }
        } catch (error) {
            this.results.failed.push('API documentation check failed: ' + error.message);
        }
    }

    validateSwaggerSpec(swagger) {
        // Check API versioning
        if (swagger.info && swagger.info.version) {
            this.results.passed.push('API versioning implemented');
        } else {
            this.results.warnings.push('API versioning not found');
        }

        // Check security definitions
        if (swagger.components && swagger.components.securitySchemes) {
            this.results.passed.push('Security schemes defined');
        } else {
            this.results.warnings.push('No security schemes defined');
        }

        // Check response schemas
        let hasResponseSchemas = false;
        for (const path in swagger.paths) {
            for (const method in swagger.paths[path]) {
                const operation = swagger.paths[path][method];
                if (operation.responses && Object.keys(operation.responses).length > 0) {
                    hasResponseSchemas = true;
                    break;
                }
            }
        }

        if (hasResponseSchemas) {
            this.results.passed.push('Response schemas defined');
        } else {
            this.results.warnings.push('No response schemas found');
        }
    }

    async validateDatabase() {
        console.log('Checking Database Configuration...');
        try {
            // Check database schema
            await this.checkDatabaseSchema();
            // Check indexes
            await this.checkDatabaseIndexes();
            // Check query performance
            await this.checkQueryPerformance();
        } catch (error) {
            this.results.failed.push('Database validation failed: ' + error.message);
        }
    }

    async checkDatabaseSchema() {
        try {
            const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
            
            // Check model definitions
            if (prismaSchema.includes('model')) {
                this.results.passed.push('Database models defined');
            } else {
                this.results.warnings.push('No database models found');
            }

            // Check relations
            if (prismaSchema.includes('@relation')) {
                this.results.passed.push('Model relations defined');
            } else {
                this.results.warnings.push('No model relations found');
            }

            // Check indexes
            if (prismaSchema.includes('@@index')) {
                this.results.passed.push('Database indexes defined');
            } else {
                this.results.warnings.push('No database indexes found');
            }
        } catch (error) {
            this.results.warnings.push('Database schema check failed: ' + error.message);
        }
    }

    async validateSecurity() {
        console.log('Checking Security Controls...');
        try {
            // Check authentication
            await this.checkAuthentication();
            // Check authorization
            await this.checkAuthorization();
            // Check data validation
            await this.checkDataValidation();
        } catch (error) {
            this.results.failed.push('Security validation failed: ' + error.message);
        }
    }

    async checkAuthentication() {
        try {
            const files = this.findSourceFiles('src', '.ts');
            let hasAuthImplementation = false;
            let hasJWTImplementation = false;

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('@UseGuards') || content.includes('AuthGuard')) {
                    hasAuthImplementation = true;
                }
                if (content.includes('jwt.verify') || content.includes('JwtService')) {
                    hasJWTImplementation = true;
                }
            }

            if (hasAuthImplementation) {
                this.results.passed.push('Authentication guards implemented');
            } else {
                this.results.warnings.push('No authentication guards found');
            }

            if (hasJWTImplementation) {
                this.results.passed.push('JWT authentication implemented');
            } else {
                this.results.warnings.push('No JWT implementation found');
            }
        } catch (error) {
            this.results.warnings.push('Authentication check failed: ' + error.message);
        }
    }

    async validatePerformance() {
        console.log('Checking Performance Optimizations...');
        try {
            // Check caching implementation
            await this.checkCaching();
            // Check connection pooling
            await this.checkConnectionPooling();
            // Check query optimization
            await this.checkQueryOptimization();
        } catch (error) {
            this.results.failed.push('Performance validation failed: ' + error.message);
        }
    }

    async checkCaching() {
        try {
            const files = this.findSourceFiles('src', '.ts');
            let hasCacheImplementation = false;
            let hasRedisImplementation = false;

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('@CacheInterceptor') || content.includes('CacheModule')) {
                    hasCacheImplementation = true;
                }
                if (content.includes('Redis') || content.includes('RedisModule')) {
                    hasRedisImplementation = true;
                }
            }

            if (hasCacheImplementation) {
                this.results.passed.push('Caching implemented');
            } else {
                this.results.warnings.push('No caching implementation found');
            }

            if (hasRedisImplementation) {
                this.results.passed.push('Redis caching implemented');
            } else {
                this.results.warnings.push('No Redis implementation found');
            }
        } catch (error) {
            this.results.warnings.push('Cache check failed: ' + error.message);
        }
    }

    async validateErrorHandling() {
        console.log('Checking Error Handling...');
        try {
            // Check global error handling
            await this.checkGlobalErrorHandler();
            // Check domain error handling
            await this.checkDomainErrors();
            // Check validation pipes
            await this.checkValidationPipes();
        } catch (error) {
            this.results.failed.push('Error handling validation failed: ' + error.message);
        }
    }

    findSourceFiles(directory, extension) {
        const files = [];
        const entries = fs.readdirSync(directory, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.findSourceFiles(fullPath, extension));
            } else if (entry.isFile() && entry.name.endsWith(extension)) {
                files.push(fullPath);
            }
        }

        return files;
    }

    async runAllChecks() {
        console.log('Starting Backend Development Validation...\n');
        
        await this.validateAPI();
        await this.validateDatabase();
        await this.validateSecurity();
        await this.validatePerformance();
        await this.validateErrorHandling();
        
        this.printResults();
    }

    printResults() {
        console.log('\nBackend Development Validation Results:');
        console.log('=====================================\n');

        console.log('Passed Checks:');
        this.results.passed.forEach(item => console.log('✅ ' + item));

        console.log('\nFailed Checks:');
        this.results.failed.forEach(item => console.log('❌ ' + item));

        console.log('\nWarnings:');
        this.results.warnings.forEach(item => console.log('⚠️  ' + item));

        console.log('\nNot Checked:');
        this.results.notChecked.forEach(item => console.log('❓ ' + item));
    }
}

// Run the validator if this script is executed directly
if (require.main === module) {
    const validator = new BackendValidator();
    validator.runAllChecks().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = BackendValidator;
