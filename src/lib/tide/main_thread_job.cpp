/**
 * Copyright (c) 2012 - 2014 TideSDK contributors 
 * http://www.tidesdk.org
 * Includes modified sources under the Apache 2 License
 * Copyright (c) 2008 - 2012 Appcelerator Inc
 * Refer to LICENSE for details of distribution and use.
 **/

#include <Poco/Semaphore.h>
#include "tide.h"

namespace tide
{

    MainThreadJob::MainThreadJob(TiMethodRef method, TiObjectRef thisObject,
        const ValueList& args, bool waitForCompletion) :
        method(method),
        thisObject(thisObject),
        args(args),
        waitForCompletion(waitForCompletion),
        returnValue(NULL),
        exception(ValueException(NULL)),
        semaphore(0, 1)
    {
        // The semaphore starts at 0, meaning that the calling
        // thread can wait for the value to become >0 using wait()
        // and the main thread can call set() after job execution
        // which meets this condition.
    }

    void MainThreadJob::Wait()
    {
        if (this->waitForCompletion)
            this->semaphore.wait();
    }

    void MainThreadJob::Execute()
    {
        try
        {
            if (thisObject.isNull())
                this->returnValue = this->method->Call(this->args);
            else
                this->returnValue = this->method->Call(thisObject, this->args);
        }
        catch (ValueException& e)
        {
            this->exception = e;
        }
        catch (Poco::SystemException& e)
        {
            this->exception = ValueException::FromString(e.displayText());
        }
        catch (std::exception& e)
        {
            this->exception = ValueException::FromString(e.what());
        }
        catch (...)
        {
            this->exception = ValueException::FromString("Unknown Exception from job queue");
        }

        if (this->waitForCompletion)
            this->semaphore.set();
    }

    ValueRef MainThreadJob::GetResult()
    {
        return this->returnValue;
    }

    ValueException MainThreadJob::GetException()
    {
        return this->exception;
    }

    bool MainThreadJob::ShouldWaitForCompletion()
    {
        return this->waitForCompletion;
    }

    void MainThreadJob::PrintException()
    {
        static Logger* logger = Logger::Get("Host");
        if (this->returnValue.isNull())
        {
            logger->Error("Error in the job queue: %s",
                this->exception.ToString().c_str());
        }
    }
}
